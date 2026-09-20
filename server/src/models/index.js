const { Sequelize, DataTypes, Op } = require('sequelize');

// SSL configuration for hosted PostgreSQL (Supabase requires SSL)
const isLocalhost = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('localhost') || 
  process.env.DATABASE_URL.includes('127.0.0.1')
);

const dialectOptions = (!isLocalhost && process.env.DB_SSL !== 'false') ? {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
} : {};

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

const uuid = {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
};

// ─── User ────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: uuid,
  mobileNumber: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
    field: 'mobile_number',
    validate: { notEmpty: true },
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING,
    field: 'password_hash',
  },
  role: {
    type: DataTypes.ENUM('citizen', 'officer', 'admin'),
    allowNull: false,
    defaultValue: 'citizen',
  },
  status: {
    type: DataTypes.ENUM('active', 'blocked', 'pending'),
    allowNull: false,
    defaultValue: 'pending',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at',
  },
}, {
  tableName: 'users',
  indexes: [
    { unique: true, fields: ['mobile_number'] },
    { unique: true, fields: ['email'], where: { email: { [Op.ne]: null } } },
  ],
});

// ─── Family ──────────────────────────────────────────────────────────────────
const Family = sequelize.define('Family', {
  id: uuid,
  familyIdNumber: {
    type: DataTypes.STRING(50),
    unique: true,
    field: 'family_id_number',
  },
  addressId: {
    type: DataTypes.STRING(100),
    field: 'address_id',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending'),
    allowNull: false,
    defaultValue: 'active',
  },
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by',
  },
  annualIncome: {
    type: DataTypes.INTEGER,
    field: 'annual_income',
    defaultValue: null,
    comment: 'Annual household income in INR',
  },
  verificationStatus: {
    type: DataTypes.ENUM('VERIFIED', 'REQUIRES_UPDATE', 'UNDER_REVIEW', 'PENDING'),
    allowNull: false,
    defaultValue: 'UNDER_REVIEW',
    field: 'verification_status',
  },
  district: {
    type: DataTypes.STRING(100),
    defaultValue: 'Anand',
  },
  villageCity: {
    type: DataTypes.STRING(100),
    field: 'village_city',
    defaultValue: 'Anand',
  },
}, {
  tableName: 'families',
});

// ─── FamilyMember ─────────────────────────────────────────────────────────────
const FamilyMember = sequelize.define('FamilyMember', {
  id: uuid,
  familyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'family_id',
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'full_name',
  },
  relationToHead: {
    type: DataTypes.STRING(50),
    field: 'relation_to_head',
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    field: 'date_of_birth',
  },
  gender: {
    type: DataTypes.STRING(20),
  },
  occupation: {
    type: DataTypes.STRING(100),
  },
  educationLevel: {
    type: DataTypes.STRING(50),
    field: 'education_level',
  },
  disabilityStatus: {
    type: DataTypes.STRING(50),
    field: 'disability_status',
  },
  maritalStatus: {
    type: DataTypes.STRING(30),
    field: 'marital_status',
  },
  isFamilyHead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_family_head',
  },
  verificationStatus: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending',
    field: 'verification_status',
  },
  aadhaarReference: {
    type: DataTypes.STRING(100),
    field: 'aadhaar_reference',
  },
  mobileNumber: {
    type: DataTypes.STRING(15),
    field: 'mobile_number',
  },
  userId: {
    type: DataTypes.UUID,
    field: 'user_id',
  },
}, {
  tableName: 'family_members',
});

// ─── Scheme ───────────────────────────────────────────────────────────────────
const Scheme = sequelize.define('Scheme', {
  id: uuid,
  code: {
    type: DataTypes.STRING(50),
    unique: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  targetBeneficiary: {
    type: DataTypes.STRING(200),
    field: 'target_beneficiary',
    allowNull: true,
  },
  benefit: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'schemes',
});

// ─── SchemeRule ───────────────────────────────────────────────────────────────
const SchemeRule = sequelize.define('SchemeRule', {
  id: uuid,
  schemeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'scheme_id',
  },
  ruleType: {
    type: DataTypes.STRING(50),
    field: 'rule_type',
  },
  fieldName: {
    type: DataTypes.STRING(100),
    field: 'field_name',
  },
  operator: {
    type: DataTypes.STRING(30),
  },
  value: {
    type: DataTypes.JSONB,
  },
  groupKey: {
    type: DataTypes.STRING(50),
    field: 'group_key',
  },
}, {
  tableName: 'scheme_rules',
});

// ─── SchemeDocument ───────────────────────────────────────────────────────────
const SchemeDocument = sequelize.define('SchemeDocument', {
  id: uuid,
  schemeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'scheme_id',
  },
  documentType: {
    type: DataTypes.STRING(100),
    field: 'document_type',
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_required',
  },
}, {
  tableName: 'scheme_documents',
});

// ─── Application ──────────────────────────────────────────────────────────────
const Application = sequelize.define('Application', {
  id: uuid,
  applicationId: {
    type: DataTypes.STRING(50),
    unique: true,
    field: 'application_id',
  },
  familyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'family_id',
  },
  schemeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'scheme_id',
  },
  appliedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'applied_by',
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DOCUMENT_REQUIRED'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  missingDocuments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'missing_documents',
  },
  remarks: {
    type: DataTypes.TEXT,
  },
  benefit: {
    type: DataTypes.STRING(255),
  },
}, {
  tableName: 'applications',
});

// ─── Document ────────────────────────────────────────────────────────────────
const Document = sequelize.define('Document', {
  id: uuid,
  familyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'family_id',
  },
  memberId: {
    type: DataTypes.UUID,
    field: 'member_id',
  },
  applicationId: {
    type: DataTypes.UUID,
    field: 'application_id',
  },
  documentType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'document_type',
  },
  documentName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'document_name',
  },
  storageReference: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'storage_reference',
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'mime_type',
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size',
  },
  status: {
    type: DataTypes.ENUM('UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'),
    allowNull: false,
    defaultValue: 'UPLOADED',
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'uploaded_at',
  },
  verifiedAt: {
    type: DataTypes.DATE,
    field: 'verified_at',
  },
  verifiedBy: {
    type: DataTypes.UUID,
    field: 'verified_by',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    field: 'rejection_reason',
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    field: 'expiry_date',
  },
  extractedData: {
    type: DataTypes.JSONB,
    field: 'extracted_data',
  },
  consistencyFlags: {
    type: DataTypes.JSONB,
    field: 'consistency_flags',
  },
}, {
  tableName: 'documents',
});

// ─── AuditLog ─────────────────────────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id: uuid,
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'entity_type', // 'FAMILY', 'MEMBER', 'DUPLICATE', 'APPLICATION'
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'entity_id',
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  previousState: {
    type: DataTypes.JSONB,
    field: 'previous_state',
  },
  newState: {
    type: DataTypes.JSONB,
    field: 'new_state',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  performedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'performed_by',
  },
  performedByRole: {
    type: DataTypes.STRING(50),
    field: 'performed_by_role',
  },
  officerName: {
    type: DataTypes.STRING(150),
    field: 'officer_name',
  },
}, {
  tableName: 'audit_logs',
});

// ─── DuplicateRecord ──────────────────────────────────────────────────────────
const DuplicateRecord = sequelize.define('DuplicateRecord', {
  id: uuid,
  recordType: {
    type: DataTypes.STRING(30),
    defaultValue: 'FAMILY',
    field: 'record_type',
  },
  sourceFamilyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'source_family_id',
  },
  matchedFamilyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'matched_family_id',
  },
  sourceMemberId: {
    type: DataTypes.UUID,
    field: 'source_member_id',
  },
  matchedMemberId: {
    type: DataTypes.UUID,
    field: 'matched_member_id',
  },
  status: {
    type: DataTypes.ENUM('POSSIBLE_DUPLICATE', 'CONFIRMED_DUPLICATE', 'NOT_A_DUPLICATE', 'REVIEW_LATER'),
    defaultValue: 'POSSIBLE_DUPLICATE',
    allowNull: false,
  },
  matchingFields: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'matching_fields',
  },
  explanation: {
    type: DataTypes.TEXT,
  },
  confidenceScore: {
    type: DataTypes.FLOAT,
    field: 'confidence_score',
  },
  decisionNotes: {
    type: DataTypes.TEXT,
    field: 'decision_notes',
  },
  reviewedBy: {
    type: DataTypes.UUID,
    field: 'reviewed_by',
  },
  reviewedAt: {
    type: DataTypes.DATE,
    field: 'reviewed_at',
  },
}, {
  tableName: 'duplicate_records',
});

// ─── Associations ─────────────────────────────────────────────────────────────
Family.hasMany(FamilyMember, { foreignKey: 'family_id', as: 'members' });
FamilyMember.belongsTo(Family, { foreignKey: 'family_id' });

Scheme.hasMany(SchemeRule, { foreignKey: 'scheme_id', as: 'rules' });
SchemeRule.belongsTo(Scheme, { foreignKey: 'scheme_id' });

Scheme.hasMany(SchemeDocument, { foreignKey: 'scheme_id', as: 'documents' });
SchemeDocument.belongsTo(Scheme, { foreignKey: 'scheme_id' });

Family.hasMany(Application, { foreignKey: 'family_id', as: 'applications' });
Application.belongsTo(Family, { foreignKey: 'family_id', as: 'family' });

Family.hasMany(Document, { foreignKey: 'family_id', as: 'documents' });
Document.belongsTo(Family, { foreignKey: 'family_id', as: 'family' });
FamilyMember.hasMany(Document, { foreignKey: 'member_id', as: 'documents' });
Document.belongsTo(FamilyMember, { foreignKey: 'member_id', as: 'member' });
Application.hasMany(Document, { foreignKey: 'application_id', as: 'documents' });
Document.belongsTo(Application, { foreignKey: 'application_id', as: 'application' });
User.hasMany(Document, { foreignKey: 'verified_by', as: 'verifiedDocuments' });
Document.belongsTo(User, { foreignKey: 'verified_by', as: 'verifier' });

Scheme.hasMany(Application, { foreignKey: 'scheme_id', as: 'applications' });
Application.belongsTo(Scheme, { foreignKey: 'scheme_id', as: 'scheme' });

User.hasMany(Application, { foreignKey: 'applied_by', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'applied_by', as: 'applicant' });

Family.hasMany(AuditLog, { foreignKey: 'entity_id', constraints: false, as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'performed_by', as: 'officer' });
AuditLog.belongsTo(Family, { foreignKey: 'entity_id', constraints: false, as: 'family' });
AuditLog.belongsTo(Application, { foreignKey: 'entity_id', constraints: false, as: 'application' });
Application.hasMany(AuditLog, { foreignKey: 'entity_id', constraints: false, as: 'auditLogs' });

DuplicateRecord.belongsTo(Family, { foreignKey: 'source_family_id', as: 'sourceFamily' });
DuplicateRecord.belongsTo(Family, { foreignKey: 'matched_family_id', as: 'matchedFamily' });
DuplicateRecord.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

module.exports = {
  sequelize,
  User,
  Family,
  FamilyMember,
  Scheme,
  SchemeRule,
  SchemeDocument,
  Application,
  Document,
  AuditLog,
  DuplicateRecord,
};