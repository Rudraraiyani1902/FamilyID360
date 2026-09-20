const express = require('express');

const {
  createFamily,
  getFamily,
  getMyFamily,
  updateFamily,
  updateMyFamily,
  addMember,
  getMembers,
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

// For PUT (update) — fields are optional (partial update)
const memberUpdateValidation = validate([
  { field: 'fullName', required: false, type: 'string', maxLength: 150 },
  { field: 'relationToHead', required: false, type: 'string', maxLength: 50 },
  { field: 'dateOfBirth', required: false, type: 'string' },
  { field: 'gender', required: false, type: 'string' },
]);

// All routes require authentication
router.use(authenticate);

// POST   /api/families         — Create a family
router.post('/', familyValidation, createFamily);

// GET    /api/families/me      — Get authenticated user's family
router.get('/me', getMyFamily);

// PUT    /api/families/me      — Update authenticated user's family
router.put('/me', updateMyFamily);

// GET    /api/families/:id     — Get a family by ID
router.get('/:familyId', authorizeFamilyAccess, getFamily);

// PUT    /api/families/:id     — Update a family
router.put('/:familyId', authorizeFamilyAccess, updateFamily);

// POST   /api/families/:id/members  — Add a member to a family
router.post('/:familyId/members', authorizeFamilyAccess, memberValidation, addMember);

// GET    /api/families/:id/members  — Get all members of a family
router.get('/:familyId/members', authorizeFamilyAccess, getMembers);

// PUT    /api/members/:id      — Update a member (standalone path)
router.put('/:familyId/members/:memberId', authorizeFamilyAccess, memberUpdateValidation, updateMember);

// DELETE /api/members/:id      — Remove a member (standalone path)
router.delete('/:familyId/members/:memberId', authorizeFamilyAccess, removeMember);

module.exports = router;