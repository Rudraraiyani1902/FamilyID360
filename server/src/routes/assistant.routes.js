const express = require('express');
const { chat } = require('../controllers/assistant.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/chat', authenticate, chat);

module.exports = router;