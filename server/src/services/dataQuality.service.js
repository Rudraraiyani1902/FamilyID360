const { Op } = require('sequelize');
const { Family, FamilyMember, DuplicateRecord } = require('../models');

// Helper to normalize Gujarati names (e.g., Ramesh Patel vs Rameshbhai Patel)
const normalizeName = (name = '') => {
  return name
    .toLowerCase()
    .replace(/\b(bhai|ben|kumar|kumari|devi|prasad|lal|sinh|singh)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

// Calculate Levenshtein similarity (0 to 1)
const stringSimilarity = (s1, s2) => {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  const n1 = normalizeName(s1);
  const n2 = normalizeName(s2);
  if (n1 === n2) return 0.95;
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;
  return 0;
};

// Calculate age from date string
const getAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// ── Feature 5: Explainable Duplicate Detection ─────────────────────────────────
const runDuplicateDetection = async () => {
  const families = await Family.findAll({
    include: [{ model: FamilyMember, as: 'members' }],
    order: [['createdAt', 'ASC']],
  });

  const duplicatesFound = [];

  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      const f1 = families[i];
      const f2 = families[j];

      // Don't compare a family to itself
      if (f1.id === f2.id) continue;

      const head1 = f1.members?.find((m) => m.isFamilyHead) || f1.members?.[0];
      const head2 = f2.members?.find((m) => m.isFamilyHead) || f2.members?.[0];

      if (!head1 || !head2) continue;

      const matchingFields = [];
      let score = 0;

      // 1. Normalized Name Similarity
      const nameSim = stringSimilarity(head1.fullName, head2.fullName);
      if (nameSim >= 0.8) {
        matchingFields.push('Similar name');
        score += 0.35;
      }

      // 2. Date of Birth Match
      if (head1.dateOfBirth && head2.dateOfBirth && head1.dateOfBirth === head2.dateOfBirth) {
        matchingFields.push('Date of birth');
        score += 0.35;
      }

      // 3. Mobile Number Match
      if (
        head1.mobileNumber &&
        head2.mobileNumber &&
        head1.mobileNumber.replace(/\D/g, '') === head2.mobileNumber.replace(/\D/g, '')
      ) {
        matchingFields.push('Mobile number');
        score += 0.25;
      }

      // 4. Address Proximity / Match
      if (
        (f1.addressId && f2.addressId && f1.addressId === f2.addressId) ||
        (f1.district && f2.district && f1.district.toLowerCase() === f2.district.toLowerCase() &&
         f1.villageCity && f2.villageCity && f1.villageCity.toLowerCase() === f2.villageCity.toLowerCase())
      ) {
        matchingFields.push('Similar address');
        score += 0.15;
      }

      // 5. Family Relationship Overlap (e.g. same spouse name or child name)
      const names1 = (f1.members || []).map((m) => normalizeName(m.fullName));
      const names2 = (f2.members || []).map((m) => normalizeName(m.fullName));
      const overlap = names1.filter((n) => names2.includes(n));
      if (overlap.length >= 2) {
        matchingFields.push('Family relationships');
        score += 0.2;
      }

      // If at least 2 distinct strong matching indicators found
      if (matchingFields.length >= 2 && score >= 0.5) {
        const explanation = `Record A (${head1.fullName} - ${f1.familyIdNumber}) and Record B (${head2.fullName} - ${f2.familyIdNumber}) share matching indicators: ${matchingFields.join(', ')}.`;

        // Check if already persisted
        const [dupRecord, created] = await DuplicateRecord.findOrCreate({
          where: {
            sourceFamilyId: f1.id,
            matchedFamilyId: f2.id,
          },
          defaults: {
            sourceFamilyId: f1.id,
            matchedFamilyId: f2.id,
            sourceMemberId: head1.id,
            matchedMemberId: head2.id,
            recordType: 'FAMILY',
            status: 'POSSIBLE_DUPLICATE',
            matchingFields,
            explanation,
            confidenceScore: Math.min(Number(score.toFixed(2)), 0.99),
          },
        });

        if (!created && dupRecord.status === 'POSSIBLE_DUPLICATE') {
          await dupRecord.update({ matchingFields, explanation, confidenceScore: Math.min(Number(score.toFixed(2)), 0.99) });
        }

        duplicatesFound.push({
          id: dupRecord.id,
          sourceFamily: {
            id: f1.id,
            familyIdNumber: f1.familyIdNumber,
            headName: head1.fullName,
            dob: head1.dateOfBirth,
            mobile: head1.mobileNumber,
            address: f1.addressId,
          },
          matchedFamily: {
            id: f2.id,
            familyIdNumber: f2.familyIdNumber,
            headName: head2.fullName,
            dob: head2.dateOfBirth,
            mobile: head2.mobileNumber,
            address: f2.addressId,
          },
          status: dupRecord.status,
          matchingFields,
          explanation,
          confidenceScore: dupRecord.confidenceScore,
        });
      }
    }
  }

  return duplicatesFound;
};

// ── Feature 6: Data Quality Inconsistency Detection ────────────────────────────
const scanDataQualityIssues = async () => {
  const families = await Family.findAll({
    include: [{ model: FamilyMember, as: 'members' }],
  });

  const issues = [];
  const mobileMap = new Map();

  for (const family of families) {
    const members = family.members || [];
    const head = members.find((m) => m.isFamilyHead);

    // 1. Missing Income Information
    if (family.annualIncome === null || family.annualIncome === undefined) {
      issues.push({
        id: `dq-inc-${family.id}`,
        familyId: family.id,
        familyIdNumber: family.familyIdNumber,
        severity: 'HIGH',
        category: 'FINANCIAL_DATA',
        issue: 'Missing income information',
        description: `Family ${family.familyIdNumber} has no registered annual household income in Gujarat Citizen DB.`,
      });
    }

    // 2. Incomplete Family Profile (No head designated or 0 members)
    if (members.length === 0) {
      issues.push({
        id: `dq-nomem-${family.id}`,
        familyId: family.id,
        familyIdNumber: family.familyIdNumber,
        severity: 'CRITICAL',
        category: 'REGISTRY_STRUCTURE',
        issue: 'Incomplete family profile',
        description: `Household ${family.familyIdNumber} exists with 0 registered family members.`,
      });
    } else if (!head) {
      issues.push({
        id: `dq-nohead-${family.id}`,
        familyId: family.id,
        familyIdNumber: family.familyIdNumber,
        severity: 'HIGH',
        category: 'REGISTRY_STRUCTURE',
        issue: 'No designated Head of Family',
        description: `Household ${family.familyIdNumber} has ${members.length} members but none designated as Family Head.`,
      });
    }

    // Member-level checks
    for (const member of members) {
      // 3. Education Information Missing for student or working age
      const age = getAge(member.dateOfBirth);
      if (age !== null && age >= 6 && age <= 25 && !member.educationLevel) {
        issues.push({
          id: `dq-edu-${member.id}`,
          familyId: family.id,
          familyIdNumber: family.familyIdNumber,
          memberId: member.id,
          memberName: member.fullName,
          severity: 'MEDIUM',
          category: 'BENEFICIARY_DATA',
          issue: 'Education information missing',
          description: `Member ${member.fullName} (${age} yrs) has no education level recorded. May affect scholarship eligibility.`,
        });
      }

      // 4. Duplicate Mobile Number Check
      if (member.mobileNumber) {
        const cleanMobile = member.mobileNumber.replace(/\D/g, '');
        if (cleanMobile.length >= 10) {
          if (mobileMap.has(cleanMobile)) {
            const prev = mobileMap.get(cleanMobile);
            if (prev.familyId !== family.id) {
              issues.push({
                id: `dq-mob-${member.id}`,
                familyId: family.id,
                familyIdNumber: family.familyIdNumber,
                memberId: member.id,
                memberName: member.fullName,
                severity: 'HIGH',
                category: 'DUPLICATE_COMMUNICATION',
                issue: 'Duplicate mobile number across households',
                description: `Mobile ${member.mobileNumber} is registered to ${member.fullName} (${family.familyIdNumber}) and ${prev.memberName} (${prev.familyIdNumber}).`,
              });
            }
          } else {
            mobileMap.set(cleanMobile, {
              familyId: family.id,
              familyIdNumber: family.familyIdNumber,
              memberId: member.id,
              memberName: member.fullName,
            });
          }
        }
      }

      // 5. Invalid Age / Relationship Check
      if (head && member.relationToHead?.toLowerCase() === 'son' || member.relationToHead?.toLowerCase() === 'daughter') {
        const headAge = getAge(head.dateOfBirth);
        const childAge = getAge(member.dateOfBirth);
        if (headAge !== null && childAge !== null) {
          if (childAge >= headAge) {
            issues.push({
              id: `dq-age-${member.id}`,
              familyId: family.id,
              familyIdNumber: family.familyIdNumber,
              memberId: member.id,
              memberName: member.fullName,
              severity: 'CRITICAL',
              category: 'RELATIONSHIP_VALIDATION',
              issue: 'Invalid age/date relationship',
              description: `Child ${member.fullName} (${childAge} yrs) is recorded as older than or equal to Head ${head.fullName} (${headAge} yrs).`,
            });
          } else if (headAge - childAge < 14) {
            issues.push({
              id: `dq-agegap-${member.id}`,
              familyId: family.id,
              familyIdNumber: family.familyIdNumber,
              memberId: member.id,
              memberName: member.fullName,
              severity: 'HIGH',
              category: 'RELATIONSHIP_VALIDATION',
              issue: 'Suspicious parent-child age gap (< 14 years)',
              description: `Age difference between Head (${headAge} yrs) and child (${childAge} yrs) is under 14 years.`,
            });
          }
        }
      }
    }
  }

  return issues;
};

module.exports = {
  normalizeName,
  stringSimilarity,
  runDuplicateDetection,
  scanDataQualityIssues,
};
