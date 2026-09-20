const { Op } = require('sequelize');
const { Scheme, SchemeRule, SchemeDocument } = require('../models');

const schemeInclude = [
  { model: SchemeRule, as: 'rules' },
  { model: SchemeDocument, as: 'documents' },
];

const getAllSchemes = async (req, res, next) => {
  try {
    const schemes = await Scheme.findAll({
      where: { status: 'active' },
      include: schemeInclude,
      order: [['code', 'ASC']],
    });

    res.json({
      success: true,
      data: schemes,
      count: schemes.length,
    });
  } catch (error) {
    next(error);
  }
};

const getSchemeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Support lookup by UUID or by code (e.g. 'GJ-HEALTH-001')
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const condition = isUuid
      ? { id }
      : { code: id };

    const scheme = await Scheme.findOne({
      where: condition,
      include: schemeInclude,
    });

    if (!scheme) {
      return res.status(404).json({ message: 'Welfare scheme not found' });
    }

    res.json({
      success: true,
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSchemes,
  getSchemeById,
};
