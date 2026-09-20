const {
  sequelize,
  Family,
  FamilyMember,
} = require('../models');

const { safeFamily, safeMember } = require('../serializers/family.serializer');

const familyInclude = {
  model: FamilyMember,
  as: 'members',
  attributes: {
    exclude: ['aadhaarReference', 'mobileNumber', 'userId'],
  },
};

const createFamily = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { members = [], ...familyData } = req.body;

    const family = await Family.create(
      {
        ...familyData,
        createdBy: req.user.id,
        familyIdNumber: `GJ-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      },
      { transaction }
    );

    if (members.length) {
      await FamilyMember.bulkCreate(
        members.map((member) => ({
          ...member,
          familyId: family.id,
        })),
        { transaction }
      );
    }

    await transaction.commit();

    const result = await Family.findByPk(family.id, {
      include: [familyInclude],
    });

    res.status(201).json(safeFamily(result));
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

const getFamily = async (req, res, next) => {
  try {
    const family = await Family.findByPk(req.family.id, {
      include: [familyInclude],
    });

    res.json(safeFamily(family));
  } catch (error) {
    next(error);
  }
};

const updateFamily = async (req, res, next) => {
  try {
    const allowedFields = ['addressId', 'status'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    await req.family.update(updates);

    const family = await Family.findByPk(req.family.id, {
      include: [familyInclude],
    });

    res.json(safeFamily(family));
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const member = await FamilyMember.create({
      ...req.body,
      familyId: req.family.id,
    });

    res.status(201).json(safeMember(member));
  } catch (error) {
    next(error);
  }
};

const updateMember = async (req, res, next) => {
  try {
    const member = await FamilyMember.findOne({
      where: {
        id: req.params.memberId,
        familyId: req.family.id,
      },
    });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    const allowedFields = [
      'fullName',
      'relationToHead',
      'dateOfBirth',
      'gender',
      'occupation',
      'educationLevel',
      'disabilityStatus',
      'maritalStatus',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    await member.update(updates);
    res.json(safeMember(member));
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const member = await FamilyMember.findOne({
      where: {
        id: req.params.memberId,
        familyId: req.family.id,
      },
    });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    if (member.isFamilyHead) {
      return res.status(400).json({
        message: 'The family head cannot be removed',
      });
    }

    await member.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFamily,
  getFamily,
  updateFamily,
  addMember,
  updateMember,
  removeMember,
};