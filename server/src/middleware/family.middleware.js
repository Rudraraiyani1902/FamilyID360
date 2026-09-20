const { Family } = require('../models');

const authorizeFamilyAccess = async (req, res, next) => {
  try {
    const family = await Family.findByPk(req.params.familyId);

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const role = String(req.user.role).toUpperCase();
    const isPrivileged = ['OFFICER', 'ADMIN'].includes(role);
    const isOwner = family.createdBy === req.user.id;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.family = family;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authorizeFamilyAccess };