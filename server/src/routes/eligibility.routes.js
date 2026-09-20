const express = require('express');

const {
  evaluateAllSchemes,
  evaluateOneScheme,
} = require('../controllers/eligibility.controller');

const { authenticate } = require('../middleware/auth.middleware');
const {
  authorizeFamilyAccess,
} = require('../middleware/family.middleware');

const router = express.Router();

router.use(authenticate);

router.post(
  '/families/:familyId/eligibility',
  authorizeFamilyAccess,
  evaluateAllSchemes
);

router.post(
  '/families/:familyId/eligibility/:schemeId',
  authorizeFamilyAccess,
  evaluateOneScheme
);

module.exports = router;