const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const { JWT_SECRET } = process.env;

// Middleware to check user roles
const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }

      req.user = user; // Attach user to request object
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
  };
};

module.exports = {
  authorizeRoles,
};