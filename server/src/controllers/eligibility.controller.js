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
      documents: req.body.documents || [],
    });

    res.json({ results });
  } catch (error) {
    next(error);
  }
};

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
      documents: req.body.documents || [],
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  evaluateAllSchemes,
  evaluateOneScheme,
};