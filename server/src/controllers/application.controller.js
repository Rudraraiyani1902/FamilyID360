const { Op } = require('sequelize');
const {
  Family,
  FamilyMember,
  Scheme,
  Application,
} = require('../models');

// Helper to resolve user's family
const resolveUserFamily = async (userId) => {
  let family = await Family.findOne({
    where: { createdBy: userId },
    order: [['createdAt', 'DESC']],
  });

  if (!family) {
    const member = await FamilyMember.findOne({
      where: { userId },
      attributes: ['familyId'],
    });

    if (member) {
      family = await Family.findByPk(member.familyId);
    }
  }

  return family;
};

// GET /api/applications — get all applications for authenticated user's family
const getMyApplications = async (req, res, next) => {
  try {
    const family = await resolveUserFamily(req.user.id);

    if (!family) {
      return res.json({ success: true, data: [] });
    }

    const applications = await Application.findAll({
      where: { familyId: family.id },
      include: [
        {
          model: Scheme,
          as: 'scheme',
          attributes: ['id', 'code', 'name', 'department', 'benefit', 'description'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/applications — create new welfare scheme application
const createApplication = async (req, res, next) => {
  try {
    const family = await resolveUserFamily(req.user.id);

    if (!family) {
      return res.status(400).json({
        message: 'You must enroll a family household profile before applying for government schemes.',
      });
    }

    const { schemeId, missingDocuments, remarks, benefit } = req.body;

    if (!schemeId) {
      return res.status(400).json({ message: 'schemeId is required' });
    }

    // Resolve Scheme (support UUID or Scheme Code)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schemeId);
    const schemeCondition = isUuid
      ? { id: schemeId, status: 'active' }
      : { code: schemeId, status: 'active' };

    const scheme = await Scheme.findOne({ where: schemeCondition });

    if (!scheme) {
      return res.status(404).json({ message: 'Active welfare scheme not found' });
    }

    // Duplicate check: Prevent active duplicate application
    const existing = await Application.findOne({
      where: {
        familyId: family.id,
        schemeId: scheme.id,
        status: { [Op.ne]: 'REJECTED' },
      },
    });

    if (existing) {
      return res.status(409).json({
        message: `An application for "${scheme.name}" is already on file and is currently ${existing.status}. (Application ID: ${existing.applicationId})`,
        application: existing,
      });
    }

    // Generate human-readable Application ID e.g. APP-2026-001
    const totalCount = await Application.count();
    const currentYear = new Date().getFullYear();
    const applicationId = `APP-${currentYear}-${String(totalCount + 1).padStart(3, '0')}`;

    const application = await Application.create({
      applicationId,
      familyId: family.id,
      schemeId: scheme.id,
      appliedBy: req.user.id,
      status: 'PENDING',
      missingDocuments: Array.isArray(missingDocuments) ? missingDocuments : [],
      remarks: remarks || `Applied via Gujarat Citizen Welfare Portal. Verification initiated.`,
      benefit: benefit || scheme.benefit || null,
    });

    const populated = await Application.findByPk(application.id, {
      include: [
        {
          model: Scheme,
          as: 'scheme',
          attributes: ['id', 'code', 'name', 'department', 'benefit', 'description'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: `Application ${applicationId} submitted successfully for ${scheme.name}!`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyApplications,
  createApplication,
};
