/**
 * Seed Script — FamilyID360
 * Seeds real Government of Gujarat welfare schemes + a demo family.
 *
 * Run: node src/seeds/seed.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const bcrypt = require('bcrypt');
const {
  sequelize,
  User,
  Family,
  FamilyMember,
  Scheme,
  SchemeRule,
  SchemeDocument,
} = require('../models/index');

// ─── Demo Family Profile ──────────────────────────────────────────────────────
const DEMO_FAMILY_MEMBERS = [
  { fullName: 'Ramesh Patel',   relationToHead: 'Head',        dateOfBirth: '1981-06-15', gender: 'Male',   occupation: 'Farmer',         isFamilyHead: true,  verificationStatus: 'verified' },
  { fullName: 'Sunita Patel',   relationToHead: 'Wife',        dateOfBirth: '1984-03-20', gender: 'Female', occupation: 'Homemaker',      isFamilyHead: false, verificationStatus: 'verified' },
  { fullName: 'Priya Patel',    relationToHead: 'Daughter',    dateOfBirth: '2007-08-10', gender: 'Female', occupation: 'Student',        isFamilyHead: false, verificationStatus: 'verified' },
  { fullName: 'Arjun Patel',    relationToHead: 'Son',         dateOfBirth: '2012-01-05', gender: 'Male',   occupation: 'Student',        isFamilyHead: false, verificationStatus: 'pending'  },
  { fullName: 'Kamlaben Patel', relationToHead: 'Grandmother', dateOfBirth: '1956-11-22', gender: 'Female', occupation: 'Senior Citizen', isFamilyHead: false, verificationStatus: 'verified' },
];

// ─── Real Government of Gujarat Schemes ──────────────────────────────────────
const GUJARAT_SCHEMES = [
  {
    code: 'GJ-HEALTH-001',
    name: 'Mukhyamantri Amrutam (MA) Yojana',
    department: 'Health & Family Welfare',
    targetBeneficiary: 'Low-income and BPL families in Gujarat',
    benefit: 'Cashless health coverage up to ₹10 Lakh per family/year',
    description: 'Cashless health insurance up to Rs.10 lakh per family per year for serious illnesses. Covers BPL and low-income families under PMJAY-MA.',
    rules: [
      { ruleType: 'income',     fieldName: 'annualIncome', operator: 'less_than_or_equal', value: 400000, groupKey: 'income_check' },
    ],
    documents: [
      { documentType: 'income_certificate', isRequired: true  },
      { documentType: 'aadhaar_card',        isRequired: true  },
      { documentType: 'ration_card',         isRequired: false },
    ],
  },
  {
    code: 'GJ-SOCIAL-001',
    name: 'Vridha Sahay Yojana (Old Age Pension)',
    department: 'Social Justice & Empowerment',
    targetBeneficiary: 'Senior citizens aged 60 and above with low household income',
    benefit: 'Monthly pension of ₹1,000 to ₹1,250',
    description: 'Monthly pension of Rs.1000 (age 60-79) or Rs.1250 (age 80+) for destitute elderly. Annual income must not exceed Rs.1,20,000 (rural) or Rs.1,50,000 (urban).',
    rules: [
      { ruleType: 'age',    fieldName: 'member.age',    operator: 'greater_than_or_equal', value: 60,     groupKey: 'age_check'    },
      { ruleType: 'income', fieldName: 'annualIncome',  operator: 'less_than_or_equal',    value: 150000, groupKey: 'income_check' },
    ],
    documents: [
      { documentType: 'age_proof',          isRequired: true },
      { documentType: 'income_certificate', isRequired: true },
      { documentType: 'aadhaar_card',       isRequired: true },
      { documentType: 'bank_passbook',      isRequired: true },
    ],
  },
  {
    code: 'GJ-EDU-001',
    name: 'Namo Saraswati Vigyan Sadhana Yojana',
    department: 'Education Department',
    targetBeneficiary: 'Class 11 & 12 Science stream students',
    benefit: '₹25,000 scholarship assistance over two academic years',
    description: 'Scholarship for Class 11-12 Science students. Benefit: Rs.25,000 over 2 years. Family income must be below Rs.6 lakh. Minimum 50% in Class 10 required.',
    rules: [
      { ruleType: 'age',        fieldName: 'member.age',        operator: 'greater_than_or_equal', value: 16,      groupKey: 'student_age'  },
      { ruleType: 'age',        fieldName: 'member.age',        operator: 'less_than_or_equal',    value: 18,      groupKey: 'student_age'  },
      { ruleType: 'occupation', fieldName: 'member.occupation', operator: 'equals',                value: 'Student', groupKey: 'student_check' },
      { ruleType: 'income',     fieldName: 'annualIncome',      operator: 'less_than_or_equal',    value: 600000,  groupKey: 'income_check' },
    ],
    documents: [
      { documentType: 'class_10_marksheet',          isRequired: true },
      { documentType: 'school_enrollment_certificate', isRequired: true },
      { documentType: 'income_certificate',           isRequired: true },
      { documentType: 'aadhaar_card',                 isRequired: true },
    ],
  },
  {
    code: 'GJ-AGRI-001',
    name: 'Kisan Suryodaya Yojana',
    department: 'Energy & Petrochemicals',
    targetBeneficiary: 'Farmers owning/cultivating agricultural land',
    benefit: '16 hours of daytime electricity (5 AM – 9 PM) for irrigation',
    description: '16 hours of daytime electricity (5AM-9PM) for agricultural irrigation pump sets. Applicant must own or cultivate agricultural land. Age: 18-60.',
    rules: [
      { ruleType: 'occupation', fieldName: 'member.occupation', operator: 'equals',                value: 'Farmer', groupKey: 'farmer_check' },
      { ruleType: 'age',        fieldName: 'member.age',        operator: 'greater_than_or_equal', value: 18,       groupKey: 'farmer_age'  },
      { ruleType: 'age',        fieldName: 'member.age',        operator: 'less_than_or_equal',    value: 60,       groupKey: 'farmer_age'  },
    ],
    documents: [
      { documentType: 'land_ownership_document',    isRequired: true  },
      { documentType: 'aadhaar_card',                isRequired: true  },
      { documentType: 'bank_passbook',               isRequired: true  },
      { documentType: 'electricity_connection_proof', isRequired: false },
    ],
  },
  {
    code: 'GJ-WCD-001',
    name: 'Beti Bachao Beti Padhao (BBBP)',
    department: 'Women & Child Development',
    targetBeneficiary: 'Families with girl children under 21 years of age',
    benefit: 'Financial and educational welfare entitlements for girl child',
    description: 'Promotes welfare, education and empowerment of the girl child. Targets families with girl children below 21 years of age.',
    rules: [
      { ruleType: 'gender', fieldName: 'member.gender', operator: 'equals',          value: 'Female', groupKey: 'girl_child' },
      { ruleType: 'age',    fieldName: 'member.age',    operator: 'less_than',        value: 21,       groupKey: 'girl_child' },
    ],
    documents: [
      { documentType: 'birth_certificate', isRequired: true },
      { documentType: 'aadhaar_card',      isRequired: true },
    ],
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    await sequelize.sync({ alter: true });
    console.log('✅ Schema synced\n');

    // 1. Users (Citizen & Officer)
    const [user] = await User.findOrCreate({
      where: { mobileNumber: '9876543210' },
      defaults: {
        mobileNumber: '9876543210',
        email: 'ramesh.patel@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'citizen',
        status: 'active',
      },
    });
    console.log('👤 Citizen User:', user.mobileNumber);

    const [officer] = await User.findOrCreate({
      where: { mobileNumber: '9876543299' },
      defaults: {
        mobileNumber: '9876543299',
        email: 'officer.anand@gujarat.gov.in',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'officer',
        status: 'active',
      },
    });
    console.log('👮 Government Officer:', officer.mobileNumber, `(${officer.email})`);

    // 2. Family 1 (Primary Household)
    const [family, familyCreated] = await Family.findOrCreate({
      where: { familyIdNumber: 'GJ-2026-001' },
      defaults: {
        familyIdNumber: 'GJ-2026-001',
        addressId: 'VILLAGE-ANAND-GJ-388001',
        district: 'Anand',
        villageCity: 'Anand Rural',
        annualIncome: 250000,
        status: 'active',
        verificationStatus: 'UNDER_REVIEW',
        createdBy: user.id,
      },
    });
    if (!familyCreated) {
      await family.update({
        annualIncome: 250000,
        district: 'Anand',
        villageCity: 'Anand Rural',
      });
    }
    console.log(`🏠 Family 1: ${family.familyIdNumber} | Location: ${family.villageCity}, ${family.district} | Status: ${family.verificationStatus}`);

    // 3. Family 1 Members
    console.log('👨‍👩‍👧‍👦 Family 1 Members:');
    for (const m of DEMO_FAMILY_MEMBERS) {
      const [member, created] = await FamilyMember.findOrCreate({
        where: { familyId: family.id, fullName: m.fullName },
        defaults: { ...m, familyId: family.id, mobileNumber: m.isFamilyHead ? '9876543210' : undefined },
      });
      const age = Math.floor((new Date() - new Date(member.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
      console.log(`   ${created ? '✅' : '♻️ '} ${member.fullName.padEnd(16)} ${member.relationToHead.padEnd(12)} ${member.gender.padEnd(7)} Age ${age}  ${member.occupation}`);
    }

    // 4. Family 2 (Secondary household for duplicate & verification testing)
    const [family2, fam2Created] = await Family.findOrCreate({
      where: { familyIdNumber: 'GJ-2026-002' },
      defaults: {
        familyIdNumber: 'GJ-2026-002',
        addressId: 'VILLAGE-ANAND-GJ-388001',
        district: 'Anand',
        villageCity: 'Anand Rural',
        annualIncome: 260000,
        status: 'active',
        verificationStatus: 'REQUIRES_UPDATE',
        createdBy: officer.id,
      },
    });
    console.log(`🏠 Family 2: ${family2.familyIdNumber} | Status: ${family2.verificationStatus}`);

    const [dupHead, dupHeadCreated] = await FamilyMember.findOrCreate({
      where: { familyId: family2.id, fullName: 'Rameshbhai Patel' },
      defaults: {
        fullName: 'Rameshbhai Patel',
        relationToHead: 'Head',
        dateOfBirth: '1981-06-15',
        gender: 'Male',
        occupation: 'Farmer',
        mobileNumber: '9876543210', // Shared mobile triggers duplicate rule
        isFamilyHead: true,
        familyId: family2.id,
      },
    });
    const [dupSpouse, dupSpouseCreated] = await FamilyMember.findOrCreate({
      where: { familyId: family2.id, fullName: 'Sunitaben Patel' },
      defaults: {
        fullName: 'Sunitaben Patel',
        relationToHead: 'Wife',
        dateOfBirth: '1984-03-20',
        gender: 'Female',
        occupation: 'Homemaker',
        isFamilyHead: false,
        familyId: family2.id,
      },
    });
    console.log(`   ${dupHeadCreated ? '✅' : '♻️ '} Rameshbhai Patel (Duplicate candidate for Ramesh Patel)`);

    // 4. Schemes
    console.log('\n📋 Government of Gujarat Schemes:');
    for (const s of GUJARAT_SCHEMES) {
      const { rules, documents, ...meta } = s;
      const [scheme, created] = await Scheme.findOrCreate({
        where: { code: meta.code },
        defaults: { ...meta, status: 'active' },
      });
      if (!created) {
        await scheme.update({ ...meta, status: 'active' });
        await SchemeRule.destroy({ where: { schemeId: scheme.id } });
        await SchemeDocument.destroy({ where: { schemeId: scheme.id } });
      }
      await SchemeRule.bulkCreate(rules.map(r => ({ ...r, schemeId: scheme.id })));
      await SchemeDocument.bulkCreate(documents.map(d => ({ ...d, schemeId: scheme.id })));
      console.log(`   ${created ? '✅' : '🔄'} [${scheme.code}] ${scheme.name}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('  EXPECTED ELIGIBILITY OUTCOMES — Family GJ-2026-001');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  Mukhyamantri Amrutam Yojana   →  ELIGIBLE             ✅  (income Rs.2.5L < Rs.4L)');
    console.log('  Vridha Sahay Yojana            →  POTENTIALLY_ELIGIBLE ⚠️   (income Rs.2.5L > Rs.1.5L limit)');
    console.log('  Namo Saraswati Vigyan Yojana   →  NOT_ELIGIBLE         ❌  (daughter age 19 > 18)');
    console.log('  Kisan Suryodaya Yojana         →  POTENTIALLY_ELIGIBLE ⚠️   (land ownership doc missing)');
    console.log('  Beti Bachao Beti Padhao        →  ELIGIBLE             ✅  (daughter: Female, age 19 < 21)');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('\n🚀 Test now:');
    console.log(`   GET http://localhost:3000/api/families/${family.id}/eligibility`);
    console.log('   Header: Authorization: Bearer <token>\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    if (err.parent) console.error('   SQL:', err.parent.message);
    await sequelize.close();
    process.exit(1);
  }
}

seed();
