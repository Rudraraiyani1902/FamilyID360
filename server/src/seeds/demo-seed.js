/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  FamilyID360 — Hackathon Demo Seed Script                           ║
 * ║                                                                      ║
 * ║  ALL DATA IS SYNTHETIC / FICTIONAL.                                  ║
 * ║  No real citizens, Aadhaar numbers, or government records.          ║
 * ║                                                                      ║
 * ║  Run: node src/seeds/demo-seed.js                                   ║
 * ║  Reset & Re-seed: node src/seeds/demo-seed.js --reset               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
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
  Application,
  AuditLog,
  DuplicateRecord,
} = require('../models/index');

const RESET_MODE = process.argv.includes('--reset');

const DEMO_USERS = [
  { mobileNumber: '9000000001', email: 'ramesh.farmer@demo.familyid', password: 'Demo@1234', role: 'citizen', label: 'Citizen — Ramesh Patel (BPL Farmer, Anand)' },
  { mobileNumber: '9000000002', email: 'meena.urban@demo.familyid',   password: 'Demo@1234', role: 'citizen', label: 'Citizen — Meena Sharma (Urban Middle Income, Ahmedabad)' },
  { mobileNumber: '9000000003', email: 'vijay.senior@demo.familyid',  password: 'Demo@1234', role: 'citizen', label: 'Citizen — Vijay Kumar (Senior Citizen Household, Rajkot)' },
  { mobileNumber: '8000000001', email: 'officer.anand@gujarat.gov.demo', password: 'Officer@1234', role: 'officer', label: 'Officer — Priya Joshi (Anand District)' },
  { mobileNumber: '8000000002', email: 'officer.surat@gujarat.gov.demo', password: 'Officer@1234', role: 'officer', label: 'Officer — Arjun Mehta (Surat District)' },
  { mobileNumber: '7000000001', email: 'admin@familyid360.gov.demo',     password: 'Admin@1234',   role: 'admin',   label: 'Admin — System Administrator' },
];

const GUJARAT_SCHEMES = [
  {
    code: 'GJ-HEALTH-001',
    name: 'Mukhyamantri Amrutam (MA) Yojana',
    department: 'Health & Family Welfare',
    targetBeneficiary: 'BPL and low-income families in Gujarat',
    benefit: 'Cashless health coverage up to Rs.10 Lakh per family/year',
    description: 'Cashless health insurance up to Rs.10 lakh per family per year for serious illnesses. Covers BPL and low-income families under PMJAY-MA.',
    rules: [{ ruleType: 'income', fieldName: 'annualIncome', operator: 'less_than_or_equal', value: 400000, groupKey: 'income_check' }],
    documents: [
      { documentType: 'income_certificate', isRequired: true },
      { documentType: 'aadhaar_card', isRequired: true },
      { documentType: 'ration_card', isRequired: false },
    ],
  },
  {
    code: 'GJ-SOCIAL-001',
    name: 'Vridha Sahay Yojana (Old Age Pension)',
    department: 'Social Justice & Empowerment',
    targetBeneficiary: 'Senior citizens aged 60+ with low household income',
    benefit: 'Monthly pension of Rs.1,000 to Rs.1,250',
    description: 'Monthly pension for destitute elderly. Annual household income must not exceed Rs.1,20,000 (rural) or Rs.1,50,000 (urban).',
    rules: [
      { ruleType: 'age', fieldName: 'member.age', operator: 'greater_than_or_equal', value: 60, groupKey: 'age_check' },
      { ruleType: 'income', fieldName: 'annualIncome', operator: 'less_than_or_equal', value: 150000, groupKey: 'income_check' },
    ],
    documents: [
      { documentType: 'age_proof', isRequired: true },
      { documentType: 'income_certificate', isRequired: true },
      { documentType: 'aadhaar_card', isRequired: true },
      { documentType: 'bank_passbook', isRequired: true },
    ],
  },
  {
    code: 'GJ-EDU-001',
    name: 'Namo Saraswati Vigyan Sadhana Yojana',
    department: 'Education Department',
    targetBeneficiary: 'Class 11 & 12 Science stream students',
    benefit: 'Rs.25,000 scholarship over two academic years',
    description: 'Scholarship for Class 11-12 Science students. Family income below Rs.6 lakh. Minimum 50% in Class 10 required.',
    rules: [
      { ruleType: 'age', fieldName: 'member.age', operator: 'greater_than_or_equal', value: 16, groupKey: 'student_age' },
      { ruleType: 'age', fieldName: 'member.age', operator: 'less_than_or_equal', value: 18, groupKey: 'student_age' },
      { ruleType: 'occupation', fieldName: 'member.occupation', operator: 'equals', value: 'Student', groupKey: 'student_check' },
      { ruleType: 'income', fieldName: 'annualIncome', operator: 'less_than_or_equal', value: 600000, groupKey: 'income_check' },
    ],
    documents: [
      { documentType: 'class_10_marksheet', isRequired: true },
      { documentType: 'school_enrollment_certificate', isRequired: true },
      { documentType: 'income_certificate', isRequired: true },
      { documentType: 'aadhaar_card', isRequired: true },
    ],
  },
  {
    code: 'GJ-AGRI-001',
    name: 'Kisan Suryodaya Yojana',
    department: 'Energy & Petrochemicals',
    targetBeneficiary: 'Farmers owning or cultivating agricultural land',
    benefit: '16 hours daytime electricity (5 AM to 9 PM) for irrigation',
    description: '16 hours of daytime electricity for agricultural irrigation pump sets. Applicant must own or cultivate agricultural land.',
    rules: [
      { ruleType: 'occupation', fieldName: 'member.occupation', operator: 'equals', value: 'Farmer', groupKey: 'farmer_check' },
      { ruleType: 'age', fieldName: 'member.age', operator: 'greater_than_or_equal', value: 18, groupKey: 'farmer_age' },
      { ruleType: 'age', fieldName: 'member.age', operator: 'less_than_or_equal', value: 60, groupKey: 'farmer_age' },
    ],
    documents: [
      { documentType: 'land_ownership_document', isRequired: true },
      { documentType: 'aadhaar_card', isRequired: true },
      { documentType: 'bank_passbook', isRequired: true },
      { documentType: 'electricity_connection_proof', isRequired: false },
    ],
  },
  {
    code: 'GJ-WCD-001',
    name: 'Beti Bachao Beti Padhao (BBBP)',
    department: 'Women & Child Development',
    targetBeneficiary: 'Families with girl children under 21 years',
    benefit: 'Financial and educational welfare entitlements for girl child',
    description: 'Promotes welfare, education, and empowerment of the girl child. Targets families with girl children below 21 years.',
    rules: [
      { ruleType: 'gender', fieldName: 'member.gender', operator: 'equals', value: 'Female', groupKey: 'girl_child' },
      { ruleType: 'age', fieldName: 'member.age', operator: 'less_than', value: 21, groupKey: 'girl_child' },
    ],
    documents: [
      { documentType: 'birth_certificate', isRequired: true },
      { documentType: 'aadhaar_card', isRequired: true },
    ],
  },
];

const DEMO_FAMILIES = [
  {
    familyIdNumber: 'GJ-2026-001', district: 'Anand', villageCity: 'Petlad',
    annualIncome: 250000, verificationStatus: 'VERIFIED', userIndex: 0,
    members: [
      { fullName: 'Ramesh Patel',   relationToHead: 'Head',        dateOfBirth: '1981-06-15', gender: 'Male',   occupation: 'Farmer',         isFamilyHead: true,  educationLevel: 'Secondary', verificationStatus: 'verified' },
      { fullName: 'Sunita Patel',   relationToHead: 'Wife',        dateOfBirth: '1985-03-20', gender: 'Female', occupation: 'Homemaker',      isFamilyHead: false, educationLevel: 'Primary',   verificationStatus: 'verified' },
      { fullName: 'Priya Patel',    relationToHead: 'Daughter',    dateOfBirth: '2007-08-10', gender: 'Female', occupation: 'Student',        isFamilyHead: false, educationLevel: 'Secondary', verificationStatus: 'verified' },
      { fullName: 'Arjun Patel',    relationToHead: 'Son',         dateOfBirth: '2012-01-05', gender: 'Male',   occupation: 'Student',        isFamilyHead: false, educationLevel: 'Primary',   verificationStatus: 'pending' },
      { fullName: 'Kamlaben Patel', relationToHead: 'Grandmother', dateOfBirth: '1956-11-22', gender: 'Female', occupation: 'Senior Citizen', isFamilyHead: false, educationLevel: 'None',      verificationStatus: 'verified' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-002', district: 'Anand', villageCity: 'Anand Rural',
    annualIncome: 260000, verificationStatus: 'REQUIRES_UPDATE', userIndex: null, isDuplicate: true,
    members: [
      { fullName: 'Rameshbhai Patel', relationToHead: 'Head', dateOfBirth: '1981-06-15', gender: 'Male',   occupation: 'Farmer',    isFamilyHead: true,  educationLevel: 'Secondary', verificationStatus: 'pending', mobileOverride: '9000000001' },
      { fullName: 'Sunitaben Patel',  relationToHead: 'Wife', dateOfBirth: '1985-03-20', gender: 'Female', occupation: 'Homemaker', isFamilyHead: false, verificationStatus: 'pending' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-003', district: 'Ahmedabad', villageCity: 'Ahmedabad City',
    annualIncome: 780000, verificationStatus: 'VERIFIED', userIndex: 1,
    members: [
      { fullName: 'Meena Sharma',  relationToHead: 'Head',     dateOfBirth: '1978-04-10', gender: 'Female', occupation: 'Government Employee', isFamilyHead: true,  educationLevel: 'Graduate',  verificationStatus: 'verified' },
      { fullName: 'Rohan Sharma',  relationToHead: 'Husband',  dateOfBirth: '1975-07-22', gender: 'Male',   occupation: 'Business',            isFamilyHead: false, educationLevel: 'Graduate',  verificationStatus: 'verified' },
      { fullName: 'Ananya Sharma', relationToHead: 'Daughter', dateOfBirth: '2008-09-15', gender: 'Female', occupation: 'Student',             isFamilyHead: false, educationLevel: 'Secondary', verificationStatus: 'verified' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-004', district: 'Rajkot', villageCity: 'Gondal',
    annualIncome: 90000, verificationStatus: 'VERIFIED', userIndex: 2,
    members: [
      { fullName: 'Vijay Kumar',  relationToHead: 'Head', dateOfBirth: '1952-02-14', gender: 'Male',   occupation: 'Retired',        isFamilyHead: true,  educationLevel: 'Primary',   verificationStatus: 'verified' },
      { fullName: 'Savita Kumar', relationToHead: 'Wife', dateOfBirth: '1958-11-30', gender: 'Female', occupation: 'Senior Citizen', isFamilyHead: false, educationLevel: 'None',      verificationStatus: 'verified' },
      { fullName: 'Deepak Kumar', relationToHead: 'Son',  dateOfBirth: '1985-06-05', gender: 'Male',   occupation: 'Laborer',        isFamilyHead: false, educationLevel: 'Secondary', verificationStatus: 'verified' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-005', district: 'Surat', villageCity: 'Bardoli',
    annualIncome: 320000, verificationStatus: 'UNDER_REVIEW', userIndex: null,
    members: [
      { fullName: 'Haresh Vasava', relationToHead: 'Head',     dateOfBirth: '1975-05-18', gender: 'Male',   occupation: 'Farmer',         isFamilyHead: true,  educationLevel: 'Primary',   verificationStatus: 'verified' },
      { fullName: 'Rekha Vasava',  relationToHead: 'Wife',     dateOfBirth: '1979-08-22', gender: 'Female', occupation: 'Homemaker',      isFamilyHead: false, educationLevel: 'None',      verificationStatus: 'verified' },
      { fullName: 'Nilesh Vasava', relationToHead: 'Son',      dateOfBirth: '2008-03-10', gender: 'Male',   occupation: 'Student',        isFamilyHead: false, educationLevel: 'Secondary', verificationStatus: 'verified' },
      { fullName: 'Kavya Vasava',  relationToHead: 'Daughter', dateOfBirth: '2006-11-05', gender: 'Female', occupation: 'Student',        isFamilyHead: false, educationLevel: 'Secondary', verificationStatus: 'pending' },
      { fullName: 'Bharat Vasava', relationToHead: 'Son',      dateOfBirth: '2015-01-20', gender: 'Male',   occupation: 'Student',        isFamilyHead: false, educationLevel: 'Primary',   verificationStatus: 'verified' },
      { fullName: 'Ratna Vasava',  relationToHead: 'Mother',   dateOfBirth: '1950-07-15', gender: 'Female', occupation: 'Senior Citizen', isFamilyHead: false, educationLevel: 'None',      verificationStatus: 'verified' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-006', district: 'Vadodara', villageCity: 'Vadodara City',
    annualIncome: 1200000, verificationStatus: 'VERIFIED', userIndex: null,
    members: [
      { fullName: 'Suresh Joshi', relationToHead: 'Head', dateOfBirth: '1972-09-25', gender: 'Male',   occupation: 'Engineer', isFamilyHead: true,  educationLevel: 'Post Graduate', verificationStatus: 'verified' },
      { fullName: 'Aarti Joshi',  relationToHead: 'Wife', dateOfBirth: '1975-12-14', gender: 'Female', occupation: 'Teacher',  isFamilyHead: false, educationLevel: 'Graduate',      verificationStatus: 'verified' },
      { fullName: 'Mihir Joshi',  relationToHead: 'Son',  dateOfBirth: '2001-03-18', gender: 'Male',   occupation: 'Student',  isFamilyHead: false, educationLevel: 'Graduate',      verificationStatus: 'verified' },
      { fullName: 'Krish Joshi',  relationToHead: 'Son',  dateOfBirth: '2005-07-07', gender: 'Male',   occupation: 'Student',  isFamilyHead: false, educationLevel: 'Secondary',     verificationStatus: 'verified' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-007', district: 'Mehsana', villageCity: 'Visnagar',
    annualIncome: 60000, verificationStatus: 'VERIFIED', userIndex: null,
    members: [
      { fullName: 'Lalitaben Chauhan', relationToHead: 'Head',     dateOfBirth: '1965-04-08', gender: 'Female', occupation: 'Laborer', isFamilyHead: true,  educationLevel: 'Primary',   verificationStatus: 'verified' },
      { fullName: 'Disha Chauhan',     relationToHead: 'Daughter', dateOfBirth: '2003-10-14', gender: 'Female', occupation: 'Student', isFamilyHead: false, educationLevel: 'Secondary', verificationStatus: 'verified' },
      { fullName: 'Yash Chauhan',      relationToHead: 'Son',      dateOfBirth: '2010-06-30', gender: 'Male',   occupation: 'Student', isFamilyHead: false, educationLevel: 'Primary',   verificationStatus: 'verified' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-008', district: 'Dang', villageCity: 'Ahwa',
    annualIncome: 180000, verificationStatus: 'REQUIRES_UPDATE', userIndex: null,
    members: [
      { fullName: 'Mangal Gamit', relationToHead: 'Head',     dateOfBirth: '1979-03-25', gender: 'Male',   occupation: 'Farmer',    isFamilyHead: true,  educationLevel: 'None',    verificationStatus: 'verified' },
      { fullName: 'Savita Gamit', relationToHead: 'Wife',     dateOfBirth: '1983-07-12', gender: 'Female', occupation: 'Homemaker', isFamilyHead: false, educationLevel: 'None',    verificationStatus: 'verified' },
      { fullName: 'Rohit Gamit',  relationToHead: 'Son',      dateOfBirth: '2009-11-04', gender: 'Male',   occupation: 'Student',   isFamilyHead: false, educationLevel: 'Primary', verificationStatus: 'verified' },
      { fullName: 'Riya Gamit',   relationToHead: 'Daughter', dateOfBirth: '2013-05-19', gender: 'Female', occupation: 'Student',   isFamilyHead: false, educationLevel: 'Primary', verificationStatus: 'pending' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-009', district: 'Surat', villageCity: 'Surat City',
    annualIncome: 350000, verificationStatus: 'PENDING', userIndex: null,
    members: [
      { fullName: 'Prakash Modi', relationToHead: 'Head', dateOfBirth: '1988-01-30', gender: 'Male',   occupation: 'Laborer',   isFamilyHead: true,  educationLevel: 'Secondary', verificationStatus: 'pending' },
      { fullName: 'Bharti Modi',  relationToHead: 'Wife', dateOfBirth: '1991-06-15', gender: 'Female', occupation: 'Homemaker', isFamilyHead: false, educationLevel: 'Secondary', verificationStatus: 'pending' },
      { fullName: 'Rahul Modi',   relationToHead: 'Son',  dateOfBirth: '2014-09-20', gender: 'Male',   occupation: 'Student',   isFamilyHead: false, educationLevel: 'Primary',   verificationStatus: 'pending' },
    ],
  },
  {
    familyIdNumber: 'GJ-2026-010', district: 'Navsari', villageCity: 'Navsari Rural',
    annualIncome: 210000, verificationStatus: 'UNDER_REVIEW', userIndex: null,
    members: [
      { fullName: 'Dinesh Desai',    relationToHead: 'Head',        dateOfBirth: '1976-12-10', gender: 'Male',   occupation: 'Farmer',         isFamilyHead: true,  educationLevel: 'Secondary', verificationStatus: 'verified' },
      { fullName: 'Hansa Desai',     relationToHead: 'Wife',        dateOfBirth: '1980-05-22', gender: 'Female', occupation: 'Homemaker',      isFamilyHead: false, educationLevel: 'Primary',   verificationStatus: 'verified' },
      { fullName: 'Kinjal Desai',    relationToHead: 'Daughter',    dateOfBirth: '2007-02-28', gender: 'Female', occupation: 'Student',        isFamilyHead: false, educationLevel: 'Secondary', verificationStatus: 'verified' },
      { fullName: 'Varun Desai',     relationToHead: 'Son',         dateOfBirth: '2010-08-14', gender: 'Male',   occupation: 'Student',        isFamilyHead: false, educationLevel: 'Primary',   verificationStatus: 'pending' },
      { fullName: 'Nathubhai Desai', relationToHead: 'Grandfather', dateOfBirth: '1948-09-05', gender: 'Male',   occupation: 'Senior Citizen', isFamilyHead: false, educationLevel: 'Primary',   verificationStatus: 'verified' },
    ],
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    await sequelize.sync({ alter: true });
    console.log('Schema synced');

    if (RESET_MODE) {
      console.log('RESET MODE - clearing all demo data...');
      await DuplicateRecord.destroy({ where: {} });
      await AuditLog.destroy({ where: {} });
      await Application.destroy({ where: {} });
      await FamilyMember.destroy({ where: {} });
      await Family.destroy({ where: {} });
      await User.destroy({ where: {} });
      console.log('Data cleared');
    }

    // Users
    console.log('\n--- USERS ---');
    const createdUsers = [];
    for (const u of DEMO_USERS) {
      const [user, created] = await User.findOrCreate({
        where: { mobileNumber: u.mobileNumber },
        defaults: {
          mobileNumber: u.mobileNumber,
          email: u.email,
          passwordHash: await bcrypt.hash(u.password, 10),
          role: u.role,
          status: 'active',
        },
      });
      createdUsers.push(user);
      console.log((created ? 'CREATED' : 'EXISTS') + ' [' + u.role.toUpperCase() + '] ' + u.label + ' | Mobile: ' + u.mobileNumber + ' | Pass: ' + u.password);
    }

    // Schemes
    console.log('\n--- SCHEMES ---');
    const schemeMap = {};
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
      schemeMap[meta.code] = scheme;
      console.log((created ? 'CREATED' : 'UPDATED') + ' [' + scheme.code + '] ' + scheme.name);
    }

    // Families & Members
    console.log('\n--- FAMILIES ---');
    const familyMap = {};
    const officerUser = createdUsers[3];

    for (const f of DEMO_FAMILIES) {
      const ownerUser = f.userIndex !== null ? createdUsers[f.userIndex] : officerUser;
      const [family, familyCreated] = await Family.findOrCreate({
        where: { familyIdNumber: f.familyIdNumber },
        defaults: {
          familyIdNumber: f.familyIdNumber,
          addressId: 'ADDR-' + f.district.toUpperCase().replace(/\s/g, '-') + '-GJ',
          district: f.district,
          villageCity: f.villageCity,
          annualIncome: f.annualIncome,
          status: 'active',
          verificationStatus: f.verificationStatus,
          createdBy: ownerUser.id,
        },
      });
      if (!familyCreated) {
        await family.update({ district: f.district, villageCity: f.villageCity, annualIncome: f.annualIncome, verificationStatus: f.verificationStatus });
      }
      familyMap[f.familyIdNumber] = family;
      console.log((familyCreated ? 'CREATED' : 'EXISTS') + ' ' + f.familyIdNumber + ' | ' + f.villageCity + ', ' + f.district + ' | Income: Rs.' + f.annualIncome + ' | ' + f.verificationStatus);

      for (const m of f.members) {
        const { mobileOverride, ...memberData } = m;
        const mobileNum = mobileOverride || (m.isFamilyHead && f.userIndex !== null ? createdUsers[f.userIndex].mobileNumber : undefined);
        await FamilyMember.findOrCreate({
          where: { familyId: family.id, fullName: m.fullName },
          defaults: { ...memberData, familyId: family.id, mobileNumber: mobileNum },
        });
      }
      console.log('  -> ' + f.members.length + ' members seeded');
    }

    // Applications
    console.log('\n--- APPLICATIONS ---');
    const appSeed = [
      { familyKey: 'GJ-2026-001', schemeCode: 'GJ-HEALTH-001', userIndex: 0, status: 'APPROVED',          appId: 'APP-2026-0001', benefit: 'Cashless health coverage Rs.10L/year' },
      { familyKey: 'GJ-2026-001', schemeCode: 'GJ-WCD-001',    userIndex: 0, status: 'APPROVED',          appId: 'APP-2026-0002', benefit: 'Girl child welfare entitlements' },
      { familyKey: 'GJ-2026-001', schemeCode: 'GJ-AGRI-001',   userIndex: 0, status: 'DOCUMENT_REQUIRED', appId: 'APP-2026-0003', benefit: '16hr daytime electricity', missingDocuments: ['land_ownership_document'] },
      { familyKey: 'GJ-2026-003', schemeCode: 'GJ-WCD-001',    userIndex: 1, status: 'PENDING',           appId: 'APP-2026-0004', benefit: 'Girl child welfare entitlements' },
      { familyKey: 'GJ-2026-004', schemeCode: 'GJ-SOCIAL-001', userIndex: 2, status: 'APPROVED',          appId: 'APP-2026-0005', benefit: 'Monthly pension Rs.1,000' },
      { familyKey: 'GJ-2026-004', schemeCode: 'GJ-HEALTH-001', userIndex: 2, status: 'UNDER_REVIEW',      appId: 'APP-2026-0006', benefit: 'Cashless health coverage Rs.10L/year' },
      { familyKey: 'GJ-2026-005', schemeCode: 'GJ-HEALTH-001', userIndex: 0, status: 'APPROVED',          appId: 'APP-2026-0007', benefit: 'Cashless health coverage Rs.10L/year' },
      { familyKey: 'GJ-2026-007', schemeCode: 'GJ-HEALTH-001', userIndex: 0, status: 'PENDING',           appId: 'APP-2026-0008', benefit: 'Cashless health coverage Rs.10L/year' },
      { familyKey: 'GJ-2026-007', schemeCode: 'GJ-WCD-001',    userIndex: 0, status: 'DOCUMENT_REQUIRED', appId: 'APP-2026-0009', benefit: 'Girl child welfare entitlements', missingDocuments: ['birth_certificate'] },
      { familyKey: 'GJ-2026-010', schemeCode: 'GJ-SOCIAL-001', userIndex: 0, status: 'PENDING',           appId: 'APP-2026-0010', benefit: 'Monthly pension Rs.1,000-Rs.1,250' },
      { familyKey: 'GJ-2026-010', schemeCode: 'GJ-AGRI-001',   userIndex: 0, status: 'APPROVED',          appId: 'APP-2026-0011', benefit: '16hr daytime electricity' },
    ];
    for (const a of appSeed) {
      const family = familyMap[a.familyKey];
      const scheme = schemeMap[a.schemeCode];
      const appUser = createdUsers[a.userIndex];
      if (!family || !scheme) continue;
      const remarks = a.status === 'APPROVED' ? 'Application approved after document verification.' :
                      a.status === 'DOCUMENT_REQUIRED' ? 'Missing: ' + (a.missingDocuments || []).join(', ') + '. Please upload required documents.' :
                      a.status === 'UNDER_REVIEW' ? 'Application under officer review.' : null;
      const [app, created] = await Application.findOrCreate({
        where: { applicationId: a.appId },
        defaults: { applicationId: a.appId, familyId: family.id, schemeId: scheme.id, appliedBy: appUser.id, status: a.status, benefit: a.benefit, missingDocuments: a.missingDocuments || [], remarks },
      });
      console.log((created ? 'CREATED' : 'EXISTS') + ' [' + a.appId + '] ' + a.familyKey + ' -> ' + a.schemeCode + ' | ' + a.status);
    }

    // Duplicate Record
    console.log('\n--- DUPLICATE RECORDS ---');
    const f1 = familyMap['GJ-2026-001'];
    const f2 = familyMap['GJ-2026-002'];
    if (f1 && f2) {
      const [dup, created] = await DuplicateRecord.findOrCreate({
        where: { sourceFamilyId: f1.id, matchedFamilyId: f2.id },
        defaults: {
          sourceFamilyId: f1.id, matchedFamilyId: f2.id,
          status: 'POSSIBLE_DUPLICATE',
          matchingFields: ['Similar name (Ramesh / Rameshbhai)', 'Same date of birth (1981-06-15)', 'Shared mobile number', 'Same district and village'],
          explanation: 'GJ-2026-001 (Ramesh Patel) and GJ-2026-002 (Rameshbhai Patel) share the same date of birth, district, and mobile number. Possible duplicate registration.',
          confidenceScore: 0.91,
        },
      });
      console.log((created ? 'CREATED' : 'EXISTS') + ' Duplicate: GJ-2026-001 <-> GJ-2026-002 (91% confidence)');
    }

    // Audit Logs
    console.log('\n--- AUDIT LOGS ---');
    const auditEntries = [
      { entityId: familyMap['GJ-2026-001']?.id, action: 'VERIFICATION_STATUS_CHANGED', previousState: { verificationStatus: 'UNDER_REVIEW' }, newState: { verificationStatus: 'VERIFIED' }, notes: 'All documents verified. Income and Aadhaar confirmed.', officerName: 'Priya Joshi' },
      { entityId: familyMap['GJ-2026-002']?.id, action: 'VERIFICATION_STATUS_CHANGED', previousState: { verificationStatus: 'UNDER_REVIEW' }, newState: { verificationStatus: 'REQUIRES_UPDATE' }, notes: 'Possible duplicate detected. Clarification documents requested.', officerName: 'Priya Joshi' },
      { entityId: familyMap['GJ-2026-004']?.id, action: 'VERIFICATION_STATUS_CHANGED', previousState: { verificationStatus: 'UNDER_REVIEW' }, newState: { verificationStatus: 'VERIFIED' }, notes: 'Senior citizen household verified. Pension eligibility confirmed.', officerName: 'Priya Joshi' },
    ];
    for (const entry of auditEntries) {
      if (!entry.entityId) continue;
      const [log, created] = await AuditLog.findOrCreate({
        where: { entityId: entry.entityId, action: entry.action },
        defaults: { entityType: 'FAMILY', entityId: entry.entityId, action: entry.action, previousState: entry.previousState, newState: entry.newState, notes: entry.notes, performedBy: officerUser.id, performedByRole: 'officer', officerName: entry.officerName },
      });
      console.log((created ? 'CREATED' : 'EXISTS') + ' AuditLog: ' + entry.action);
    }

    console.log('\n=================================================================');
    console.log('  DEMO SEED COMPLETE');
    console.log('  10 families | 5 schemes | 11 applications | 1 duplicate record');
    console.log('=================================================================');
    console.log('\nDEMO LOGIN CREDENTIALS:');
    console.log('  CITIZEN:  9000000001 / Demo@1234  (BPL Farmer - Anand)');
    console.log('  CITIZEN:  9000000002 / Demo@1234  (Urban - Ahmedabad)');
    console.log('  CITIZEN:  9000000003 / Demo@1234  (Senior - Rajkot)');
    console.log('  OFFICER:  8000000001 / Officer@1234');
    console.log('  ADMIN:    7000000001 / Admin@1234');
    console.log('');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    if (err.parent) console.error('SQL:', err.parent.message);
    await sequelize.close();
    process.exit(1);
  }
}

seed();




