const express = require('express');

const {
  createFamily,
  getFamily,
  updateFamily,
  addMember,
  updateMember,
  removeMember,
} = require('../controllers/family.controller');

const { authorizeFamilyAccess } = require('../middleware/family.middleware');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

const familyValidation = validate([
  { field: 'addressId', required: true, type: 'string' },
]);

const memberValidation = validate([
  { field: 'fullName', required: true, type: 'string', maxLength: 150 },
  { field: 'relationToHead', required: true, type: 'string', maxLength: 50 },
  { field: 'dateOfBirth', required: true, type: 'string' },
  { field: 'gender', required: true, type: 'string' },
]);

router.use(authenticate);

router.post('/', familyValidation, createFamily);

router.get('/:familyId', authorizeFamilyAccess, getFamily);

router.patch('/:familyId', authorizeFamilyAccess, updateFamily);

router.post(
  '/:familyId/members',
  authorizeFamilyAccess,
  memberValidation,
  addMember
);

router.patch(
  '/:familyId/members/:memberId',
  authorizeFamilyAccess,
  memberValidation,
  updateMember
);

router.delete(
  '/:familyId/members/:memberId',
  authorizeFamilyAccess,
  removeMember
);

module.exports = router;