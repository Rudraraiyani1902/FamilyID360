const express = require('express');
const authController = require('../controllers/auth.controller');
const { registerValidator, loginValidator, validate } = require('../validators/auth.validator');
const { verifyToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

const router = express.Router();

// User registration route
router.post('/register', ...registerValidator, validate, authController.register);

// User login route
router.post('/login', ...loginValidator, validate, authController.login);

// Get authenticated user info & associated family
router.get('/me', verifyToken, authController.getMe);

// Protected route example for officers and admins
router.get('/protected', verifyToken, authorizeRoles('officer', 'admin'), (req, res) => {
  res.status(200).json({ message: 'This is a protected route for officers and admins.' });
});

// Export the router
module.exports = router;