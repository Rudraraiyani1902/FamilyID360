const express = require('express');

const {
  evaluateAllSchemes,
  evaluateOneScheme,
  getMyFamilyEligibility,
  getMyFamilySchemeEligibility,
} = require('../controllers/eligibility.controller');

const { authenticate } = require('../middleware/auth.middleware');
const {
  authorizeFamilyAccess,
} = require('../middleware/family.middleware');

const router = express.Router();

router.use(authenticate);

// ── Authenticated User's Family Eligibility ──────────────────────────────────
// GET  /api/families/me/eligibility           — evaluate all active schemes for current citizen
router.get('/families/me/eligibility', getMyFamilyEligibility);

// POST /api/families/me/eligibility          — evaluate with simulated document checklist
router.post('/families/me/eligibility', getMyFamilyEligibility);

// GET  /api/families/me/eligibility/:schemeId — evaluate one scheme for current citizen
router.get('/families/me/eligibility/:schemeId', getMyFamilySchemeEligibility);

// POST /api/families/me/eligibility/:schemeId — evaluate one scheme with documents
router.post('/families/me/eligibility/:schemeId', getMyFamilySchemeEligibility);

// ── Specific Family ID Eligibility (for Officers/Admins or Verified Owners) ──
// POST /api/families/:familyId/eligibility           — evaluate all active schemes
router.post(
  '/families/:familyId/eligibility',
  authorizeFamilyAccess,
  evaluateAllSchemes
);

// POST /api/families/:familyId/eligibility/:schemeId — evaluate one scheme
router.post(
  '/families/:familyId/eligibility/:schemeId',
  authorizeFamilyAccess,
  evaluateOneScheme
);

module.exports = router;