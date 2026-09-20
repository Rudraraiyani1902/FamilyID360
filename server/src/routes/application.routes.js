const express = require('express');
const {
  getMyApplications,
  createApplication,
} = require('../controllers/application.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET  /api/applications  — get applications for current citizen
router.get('/', getMyApplications);

// POST /api/applications  — submit new application
router.post('/', createApplication);

module.exports = router;
