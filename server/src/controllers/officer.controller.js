const { Op, fn, col } = require('sequelize');
const {
  Family,
  FamilyMember,
  Application,
  Scheme,
  AuditLog,
  DuplicateRecord,
  User,
} = require('../models');

const {
  runDuplicateDetection,
  scanDataQualityIssues,
} = require('../services/dataQuality.service');

// Helper to mask sensitive PII
const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return null;
  const clean = String(aadhaar).replace(/\D/g, '');
  if (clean.length < 4) return 'XXXX-XXXX-XXXX';
  return `XXXX-XXXX-${clean.slice(-4)}`;
};

const maskMobile = (mobile) => {
  if (!mobile) return null;
  const clean = String(mobile).replace(/\D/g, '');
  if (clean.length <= 4) return 'XXXXXX';
  return `${'X'.repeat(clean.length - 4)}${clean.slice(-4)}`;
};

// ── Feature 1: High-Level Beneficiary Management Statistics ────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    // Run duplicate detection scan to ensure fresh potential duplicates
    await runDuplicateDetection();

    const [
      totalFamilies,
      totalMembers,
      totalApplications,
      pendingApplications,
      approvedApplications,
      docsRequiredApplications,
      familiesRequiringVerification,
      potentialDuplicates,
      dataQualityIssues,
    ] = await Promise.all([
      Family.count(),
      FamilyMember.count(),
      Application.count(),
      Application.count({ where: { status: 'PENDING' } }),
      Application.count({ where: { status: 'APPROVED' } }),
      Application.count({ where: { status: 'DOCUMENT_REQUIRED' } }),
      Family.count({
        where: {
          verificationStatus: { [Op.ne]: 'VERIFIED' },
        },
      }),
      DuplicateRecord.count({ where: { status: 'POSSIBLE_DUPLICATE' } }),
      scanDataQualityIssues(),
    ]);

    const qualityCategories = dataQualityIssues.reduce((categories, issue) => {
      categories[issue.category] = (categories[issue.category] || 0) + 1;
      return categories;
    }, {});
    const dataQualityByCategory = Object.entries(qualityCategories).map(([category, count]) => ({ category, count }));

    const [applicationsByStatus, familiesByVerificationStatus, schemeApplicationDistribution] = await Promise.all([
      Application.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      Family.findAll({
        attributes: ['verificationStatus', [fn('COUNT', col('id')), 'count']],
        group: ['verificationStatus'],
        raw: true,
      }),
      Application.findAll({
        attributes: [[fn('COUNT', col('Application.id')), 'count']],
        include: [{ model: Scheme, as: 'scheme', attributes: ['id', 'name'] }],
        group: ['scheme.id', 'scheme.name'],
        raw: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalFamilies,
        totalFamilyMembers: totalMembers,
        totalApplications,
        pendingApplications,
        approvedApplications,
        applicationsRequiringDocuments: docsRequiredApplications,
        familiesRequiringVerification,
        potentialDuplicateRecords: potentialDuplicates,
        dataQualityIssuesCount: dataQualityIssues.length,
        recentQualityIssues: dataQualityIssues.slice(0, 5),
        applicationsByStatus: applicationsByStatus.map((row) => ({ status: row.status, count: Number(row.count) })),
        familiesByVerificationStatus: familiesByVerificationStatus.map((row) => ({
          status: row.verificationStatus,
          count: Number(row.count),
        })),
        schemeApplicationDistribution: schemeApplicationDistribution.map((row) => ({
          scheme: row['scheme.name'] || 'Unknown scheme',
          count: Number(row.count),
        })),
        dataQualityByCategory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Feature 7: Officer Application Management ────────────────────────────────
const getOfficerApplications = async (req, res, next) => {
  try {
    const { search = '', status = '', page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const where = {};

    if (status) where.status = status;
    if (search.trim()) {
      const query = search.trim();
      where[Op.or] = [
        { applicationId: { [Op.iLike]: `%${query}%` } },
        { '$family.family_id_number$': { [Op.iLike]: `%${query}%` } },
        { '$scheme.name$': { [Op.iLike]: `%${query}%` } },
      ];
    }

    const { count, rows } = await Application.findAndCountAll({
      where,
      include: [
        { model: Family, as: 'family', attributes: ['id', 'familyIdNumber'] },
        { model: Scheme, as: 'scheme', attributes: ['id', 'code', 'name'] },
      ],
      order: [['updatedAt', 'DESC']],
      limit: pageLimit,
      offset: (pageNum - 1) * pageLimit,
      distinct: true,
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: pageNum, limit: pageLimit, totalPages: Math.ceil(count / pageLimit) },
    });
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  const transaction = await Application.sequelize.transaction();
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'DOCUMENT_REQUIRED', 'APPROVED', 'REJECTED'];

    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Invalid application status. Must be one of: ${validStatuses.join(', ')}` });
    }
    if (['REJECTED', 'DOCUMENT_REQUIRED'].includes(status) && !reason?.trim()) {
      await transaction.rollback();
      return res.status(400).json({ message: 'A reason is required when rejecting or requesting documents.' });
    }

    const application = await Application.findOne({
      where: { id },
      include: [
        { model: Family, as: 'family', attributes: ['id', 'familyIdNumber'] },
        { model: Scheme, as: 'scheme', attributes: ['id', 'name'] },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Application not found.' });
    }

    const previousStatus = application.status;
    const nextRemarks = reason?.trim() || application.remarks;
    await application.update({ status, remarks: nextRemarks }, { transaction });

    const officerName = req.user.email || req.user.mobileNumber || 'Government Officer';
    await AuditLog.create({
      entityType: 'APPLICATION',
      entityId: application.id,
      action: 'APPLICATION_STATUS_CHANGED',
      previousState: { status: previousStatus },
      newState: { status, reason: reason?.trim() || null },
      notes: reason?.trim() || `Application status changed from ${previousStatus} to ${status}.`,
      performedBy: req.user.id,
      performedByRole: req.user.role,
      officerName,
    }, { transaction });

    await transaction.commit();
    res.json({ success: true, message: 'Application status updated and audit entry recorded.', data: application });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// ── Feature 8: Append-only Audit Log View ─────────────────────────────────────
const getAuditLogs = async (req, res, next) => {
  try {
    const { search = '', entityType = '', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const where = {};
    if (entityType) where.entityType = entityType;
    if (search.trim()) {
      where[Op.or] = [
        { action: { [Op.iLike]: `%${search.trim()}%` } },
        { entityType: { [Op.iLike]: `%${search.trim()}%` } },
        { officerName: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'officer', attributes: ['id', 'email', 'mobileNumber'] },
        { model: Family, as: 'family', attributes: ['id', 'familyIdNumber'] },
        {
          model: Application,
          as: 'application',
          attributes: ['id'],
          include: [{ model: Family, as: 'family', attributes: ['id', 'familyIdNumber'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: pageLimit,
      offset: (pageNum - 1) * pageLimit,
      distinct: true,
    });

    const data = rows.map((log) => {
      const item = log.toJSON();
      item.familyId = item.family?.familyIdNumber || item.application?.family?.familyIdNumber || null;
      delete item.family;
      return item;
    });
    res.json({
      success: true,
      data,
      pagination: { total: count, page: pageNum, limit: pageLimit, totalPages: Math.ceil(count / pageLimit) },
    });
  } catch (error) {
    next(error);
  }
};

// ── Feature 2: Family Search with Server-Side Filtering & Pagination ───────────
const searchFamilies = async (req, res, next) => {
  try {
    const {
      search = '',
      district = '',
      villageCity = '',
      verificationStatus = '',
      status = '',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * pageLimit;

    // Build Family where clauses
    const whereClause = {};

    if (verificationStatus) {
      whereClause.verificationStatus = verificationStatus;
    }

    if (status) {
      whereClause.status = status;
    }

    if (district) {
      whereClause.district = { [Op.iLike]: `%${district}%` };
    }

    if (villageCity) {
      whereClause.villageCity = { [Op.iLike]: `%${villageCity}%` };
    }

    // If search term provided
    if (search.trim()) {
      const q = search.trim();
      whereClause[Op.or] = [
        { familyIdNumber: { [Op.iLike]: `%${q}%` } },
        { addressId: { [Op.iLike]: `%${q}%` } },
        { '$members.full_name$': { [Op.iLike]: `%${q}%` } },
        { '$members.mobile_number$': { [Op.iLike]: `%${q}%` } },
      ];
    }

    const { count, rows: families } = await Family.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: FamilyMember,
          as: 'members',
          attributes: ['id', 'fullName', 'relationToHead', 'isFamilyHead', 'gender', 'dateOfBirth', 'mobileNumber'],
        },
        {
          model: Application,
          as: 'applications',
          attributes: ['id', 'applicationId', 'status'],
        },
      ],
      distinct: true,
      order: [['updatedAt', 'DESC']],
      limit: pageLimit,
      offset,
    });

    // Transform into clean officer rows
    const transformed = families.map((fam) => {
      const head = (fam.members || []).find((m) => m.isFamilyHead) || fam.members?.[0];
      return {
        id: fam.id,
        familyIdNumber: fam.familyIdNumber,
        headName: head?.fullName || 'Not Designated',
        headMobile: maskMobile(head?.mobileNumber),
        memberCount: (fam.members || []).length,
        location: fam.villageCity ? `${fam.villageCity}, ${fam.district}` : fam.addressId || 'Gujarat',
        verificationStatus: fam.verificationStatus || 'UNDER_REVIEW',
        applicationsCount: (fam.applications || []).length,
        activeStatus: fam.status,
        lastUpdated: fam.updatedAt,
      };
    });

    res.json({
      success: true,
      data: transformed,
      pagination: {
        total: count,
        page: pageNum,
        limit: pageLimit,
        totalPages: Math.ceil(count / pageLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Feature 3: Authorized Family Inspection with Sensitive Data Masking ────────
const getFamilyDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const condition = isUuid
      ? { id }
      : { familyIdNumber: id };

    const family = await Family.findOne({
      where: condition,
      include: [
        {
          model: FamilyMember,
          as: 'members',
        },
        {
          model: Application,
          as: 'applications',
          include: [
            {
              model: Scheme,
              as: 'scheme',
              attributes: ['id', 'code', 'name', 'department', 'benefit'],
            },
          ],
        },
        {
          model: AuditLog,
          as: 'auditLogs',
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (!family) {
      return res.status(404).json({ message: 'Family record not found in Gujarat State Registry.' });
    }

    // Mask sensitive PII for members
    const sanitizedMembers = (family.members || []).map((m) => {
      const data = m.toJSON();
      data.aadhaarReferenceMasked = maskAadhaar(data.aadhaarReference);
      data.mobileNumberMasked = maskMobile(data.mobileNumber);
      delete data.aadhaarReference; // Never expose unmasked in response
      return data;
    });

    const sanitizedFamily = family.toJSON();
    sanitizedFamily.members = sanitizedMembers;

    res.json({
      success: true,
      data: sanitizedFamily,
    });
  } catch (error) {
    next(error);
  }
};

// ── Feature 4: Family Verification with Audit Logging ──────────────────────────
const updateFamilyVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verificationStatus, notes } = req.body;

    const validStatuses = ['VERIFIED', 'REQUIRES_UPDATE', 'UNDER_REVIEW'];
    if (!validStatuses.includes(verificationStatus)) {
      return res.status(400).json({
        message: `Invalid verification status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const family = await Family.findOne({
      where: isUuid ? { id } : { familyIdNumber: id },
    });

    if (!family) {
      return res.status(404).json({ message: 'Family record not found.' });
    }

    const previousStatus = family.verificationStatus;

    // Update Family verification status
    await family.update({ verificationStatus });

    // Fetch officer user details for audit trail
    const officerUser = await User.findByPk(req.user.id);
    const officerName = officerUser?.email || officerUser?.mobileNumber || 'Government Officer';

    // Create Audit Log
    const audit = await AuditLog.create({
      entityType: 'FAMILY',
      entityId: family.id,
      action: 'VERIFICATION_STATUS_CHANGED',
      previousState: { verificationStatus: previousStatus },
      newState: { verificationStatus },
      notes: notes || `Verification status transitioned from ${previousStatus} to ${verificationStatus} by authorized officer.`,
      performedBy: req.user.id,
      performedByRole: req.user.role || 'officer',
      officerName,
    });

    res.json({
      success: true,
      message: `Family ${family.familyIdNumber} status marked as ${verificationStatus}. Audit entry recorded.`,
      data: {
        familyIdNumber: family.familyIdNumber,
        verificationStatus: family.verificationStatus,
        auditLog: audit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Feature 5: Duplicate Records & Officer Review ──────────────────────────────
const getDuplicateRecords = async (req, res, next) => {
  try {
    await runDuplicateDetection();

    const duplicates = await DuplicateRecord.findAll({
      include: [
        {
          model: Family,
          as: 'sourceFamily',
          include: [{ model: FamilyMember, as: 'members' }],
        },
        {
          model: Family,
          as: 'matchedFamily',
          include: [{ model: FamilyMember, as: 'members' }],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'email', 'mobileNumber', 'role'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      count: duplicates.length,
      data: duplicates,
    });
  } catch (error) {
    next(error);
  }
};

const handleDuplicateDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;

    const validDecisions = ['CONFIRMED_DUPLICATE', 'NOT_A_DUPLICATE', 'REVIEW_LATER'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        message: `Invalid decision. Must be one of: ${validDecisions.join(', ')}`,
      });
    }

    const dup = await DuplicateRecord.findByPk(id);
    if (!dup) {
      return res.status(404).json({ message: 'Duplicate record entry not found.' });
    }

    const previousStatus = dup.status;
    await dup.update({
      status: decision,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      decisionNotes: notes || `Reviewed by Officer. Decision: ${decision}`,
    });

    const officerUser = await User.findByPk(req.user.id);
    const officerName = officerUser?.email || officerUser?.mobileNumber || 'Government Officer';

    // Record decision in Audit Log
    await AuditLog.create({
      entityType: 'DUPLICATE',
      entityId: dup.id,
      action: 'DUPLICATE_DECISION',
      previousState: { status: previousStatus },
      newState: { status: decision },
      notes: notes || `Duplicate flag resolved as ${decision}.`,
      performedBy: req.user.id,
      performedByRole: req.user.role || 'officer',
      officerName,
    });

    res.json({
      success: true,
      message: `Duplicate record decision recorded as "${decision}".`,
      data: dup,
    });
  } catch (error) {
    next(error);
  }
};

// ── Feature 6: Data Quality Issues Scan ────────────────────────────────────────
const getDataQualityIssues = async (req, res, next) => {
  try {
    const issues = await scanDataQualityIssues();

    res.json({
      success: true,
      count: issues.length,
      data: issues,
    });
  } catch (error) {
    next(error);
  }
};

// Flag Family for Data Quality Issue
const flagFamilyQuality = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, category } = req.body;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const family = await Family.findOne({
      where: isUuid ? { id } : { familyIdNumber: id },
    });

    if (!family) {
      return res.status(404).json({ message: 'Family record not found.' });
    }

    await family.update({ verificationStatus: 'REQUIRES_UPDATE' });

    const officerUser = await User.findByPk(req.user.id);
    const officerName = officerUser?.email || officerUser?.mobileNumber || 'Government Officer';

    const audit = await AuditLog.create({
      entityType: 'FAMILY',
      entityId: family.id,
      action: 'DATA_QUALITY_FLAG',
      previousState: { verificationStatus: family.verificationStatus },
      newState: { verificationStatus: 'REQUIRES_UPDATE' },
      notes: reason ? `Flagged: ${category || 'Data Issue'} — ${reason}` : 'Family flagged for data quality update.',
      performedBy: req.user.id,
      performedByRole: req.user.role || 'officer',
      officerName,
    });

    res.json({
      success: true,
      message: `Family ${family.familyIdNumber} flagged for correction.`,
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  searchFamilies,
  getFamilyDetails,
  updateFamilyVerification,
  getDuplicateRecords,
  handleDuplicateDecision,
  getDataQualityIssues,
  flagFamilyQuality,
  getOfficerApplications,
  updateApplicationStatus,
  getAuditLogs,
};
