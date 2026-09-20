const express = require('express');
const authController = require('../controllers/auth.controller');
const { validateRegistration, validateLogin } = require('../validators/auth.validator');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// User registration route
router.post('/register', validateRegistration, authController.register);

// User login route
router.post('/login', validateLogin, authController.login);

// Protected route example for officers and admins
router.get('/protected', authenticate, authorize(['OFFICER', 'ADMIN']), (req, res) => {
  res.status(200).json({ message: 'This is a protected route for officers and admins.' });
});

// Export the router
module.exports = router;