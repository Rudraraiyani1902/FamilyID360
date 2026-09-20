const { Op } = require('sequelize');
const {
  Family,
  FamilyMember,
  Scheme,
  SchemeRule,
  SchemeDocument,
} = require('../models');

const {
  evaluateScheme,
  evaluateSchemes,
} = require('../services/eligibility.engine');

const familyInclude = {
  model: FamilyMember,
  as: 'members',
  attributes: {
    exclude: [
      'aadhaarReference',
      'mobileNumber',
      'userId',
    ],
  },
};

const schemeInclude = [
  { model: SchemeRule, as: 'rules' },
  { model: SchemeDocument, as: 'documents' },
];

// Helper to resolve current user's family
const resolveUserFamily = async (userId) => {
  let family = await Family.findOne({
    where: { createdBy: userId },
    include: [familyInclude],
    order: [['createdAt', 'DESC']],
  });

  if (!family) {
    const member = await FamilyMember.findOne({
      where: { userId },
      attributes: ['familyId'],
    });

    if (member) {
      family = await Family.findByPk(member.familyId, {
        include: [familyInclude],
      });
    }
  }

  return family;
};

// POST /api/families/:familyId/eligibility — evaluate all active schemes
const evaluateAllSchemes = async (req, res, next) => {
  try {
    const family = await Family.findByPk(req.family.id, {
      include: [familyInclude],
    });

    const schemes = await Scheme.findAll({
      where: { status: 'active' },
      include: schemeInclude,
    });

    const results = evaluateSchemes({
      family: family.toJSON(),
      members: family.members.map((member) => member.toJSON()),
      schemes: schemes.map((scheme) => scheme.toJSON()),
      documents: req.body?.documents || [],
    });

    res.json({ results });
  } catch (error) {
    next(error);
  }
};

// POST /api/families/:familyId/eligibility/:schemeId — evaluate one scheme
const evaluateOneScheme = async (req, res, next) => {
  try {
    const family = await Family.findByPk(req.family.id, {
      include: [familyInclude],
    });

    const scheme = await Scheme.findOne({
      where: {
        id: req.params.schemeId,
        status: 'active',
      },
      include: schemeInclude,
    });

    if (!scheme) {
      return res.status(404).json({ message: 'Active scheme not found' });
    }

    const result = evaluateScheme({
      family: family.toJSON(),
      members: family.members.map((member) => member.toJSON()),
      scheme: scheme.toJSON(),
      documents: req.body?.documents || [],
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// GET or POST /api/families/me/eligibility — evaluate authenticated user's family
const getMyFamilyEligibility = async (req, res, next) => {
  try {
    const family = await resolveUserFamily(req.user.id);

    if (!family) {
      return res.status(404).json({
        message: 'No family profile found for this citizen. Please enroll your household first.',
      });
    }

    const schemes = await Scheme.findAll({
      where: { status: 'active' },
      include: schemeInclude,
      order: [['code', 'ASC']],
    });

    const results = evaluateSchemes({
      family: family.toJSON(),
      members: (family.members || []).map((member) => member.toJSON()),
      schemes: schemes.map((scheme) => scheme.toJSON()),
      documents: req.body?.documents || req.query?.documents || [],
    });

    res.json({
      success: true,
      familyId: family.id,
      familyIdNumber: family.familyIdNumber,
      results,
    });
  } catch (error) {
    next(error);
  }
};

// GET or POST /api/families/me/eligibility/:schemeId — evaluate single scheme for authenticated user's family
const getMyFamilySchemeEligibility = async (req, res, next) => {
  try {
    const family = await resolveUserFamily(req.user.id);

    if (!family) {
      return res.status(404).json({
        message: 'No family profile found for this citizen. Please enroll your household first.',
      });
    }

    const { schemeId } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schemeId);

    const condition = isUuid
      ? { id: schemeId, status: 'active' }
      : { code: schemeId, status: 'active' };

    const scheme = await Scheme.findOne({
      where: condition,
      include: schemeInclude,
    });

    if (!scheme) {
      return res.status(404).json({ message: 'Active welfare scheme not found' });
    }

    const result = evaluateScheme({
      family: family.toJSON(),
      members: (family.members || []).map((member) => member.toJSON()),
      scheme: scheme.toJSON(),
      documents: req.body?.documents || req.query?.documents || [],
    });

    res.json({
      success: true,
      familyId: family.id,
      familyIdNumber: family.familyIdNumber,
      result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  evaluateAllSchemes,
  evaluateOneScheme,
  getMyFamilyEligibility,
  getMyFamilySchemeEligibility,
};