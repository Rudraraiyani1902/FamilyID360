const express = require('express');
const {
  getDashboardStats,
  searchFamilies,
  getFamilyDetails,
  updateFamilyVerification,
  getDuplicateRecords,
  handleDuplicateDecision,
  getDataQualityIssues,
  flagFamilyQuality,
  getOfficerApplications,
  updateApplicationStatus,
  getAuditLogs,
} = require('../controllers/officer.controller');

const { verifyToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

const router = express.Router();

// All officer routes are strictly protected by JWT and require role: officer or admin
router.use(verifyToken);
router.use(authorizeRoles('officer', 'admin'));

// Feature 1: High-Level Beneficiary Stats
router.get('/dashboard/stats', getDashboardStats);

// Feature 2: Server-Side Family Search & Pagination
router.get('/families', searchFamilies);

// Feature 3: Authorized Family Inspection
router.get('/families/:id', getFamilyDetails);

// Feature 4: Family Verification & Status Update
router.put('/families/:id/verify', updateFamilyVerification);
router.post('/families/:id/flag', flagFamilyQuality);

// Feature 5: Duplicate Detection & Officer Decisions
router.get('/duplicates', getDuplicateRecords);
router.post('/duplicates/:id/decision', handleDuplicateDecision);

// Feature 6: Data Quality Scans
router.get('/data-quality', getDataQualityIssues);

// Feature 7: Application Management
router.get('/applications', getOfficerApplications);
router.put('/applications/:id/status', updateApplicationStatus);

// Feature 8: Read-only audit trail
router.get('/audit-logs', getAuditLogs);

module.exports = router;
