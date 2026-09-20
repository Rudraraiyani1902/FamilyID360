// Middleware to check user roles.
// Relies on verifyToken having already set req.user on the request.
// Must always be used AFTER verifyToken in the middleware chain.
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // req.user is set by verifyToken; if missing, the token was not verified
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No authenticated user.' });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    const allowedRoles = roles.map((r) => String(r).toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};