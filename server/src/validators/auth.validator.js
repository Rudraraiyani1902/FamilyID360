const { body, validationResult } = require('express-validator');

const registerValidator = [
  body('mobileNumber')
    .isString()
    .withMessage('Mobile number must be a string')
    .isLength({ min: 10, max: 15 })
    .withMessage('Mobile number must be between 10 and 15 characters')
    .notEmpty()
    .withMessage('Mobile number is required'),
  
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .notEmpty()
    .withMessage('Email is required'),

  body('password')
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .notEmpty()
    .withMessage('Password is required'),
];

const loginValidator = [
  body('mobileNumber')
    .isString()
    .withMessage('Mobile number must be a string')
    .notEmpty()
    .withMessage('Mobile number is required'),

  body('password')
    .isString()
    .withMessage('Password must be a string')
    .notEmpty()
    .withMessage('Password is required'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  registerValidator,
  loginValidator,
  validate,
};