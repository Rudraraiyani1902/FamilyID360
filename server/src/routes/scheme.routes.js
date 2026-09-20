const express = require('express');
const { getAllSchemes, getSchemeById } = require('../controllers/scheme.controller');

const router = express.Router();

// GET /api/schemes       — list all active welfare schemes
router.get('/', getAllSchemes);

// GET /api/schemes/:id   — get scheme details by UUID or scheme code
router.get('/:id', getSchemeById);

module.exports = router;
