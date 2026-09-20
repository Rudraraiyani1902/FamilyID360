const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const config = require('../config/auth');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).send({ message: 'No token provided!' });
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized!' });
    }
    req.userId = decoded.id;
    next();
  });
};

// Middleware to check if the user is an ADMIN
const isAdmin = (req, res, next) => {
  User.findByPk(req.userId).then(user => {
    if (user.role !== 'admin') {
      return res.status(403).send({ message: 'Require Admin Role!' });
    }
    next();
  });
};

// Middleware to check if the user is an OFFICER
const isOfficer = (req, res, next) => {
  User.findByPk(req.userId).then(user => {
    if (user.role !== 'officer') {
      return res.status(403).send({ message: 'Require Officer Role!' });
    }
    next();
  });
};

// Middleware to check if the user is a CITIZEN
const isCitizen = (req, res, next) => {
  User.findByPk(req.userId).then(user => {
    if (user.role !== 'citizen') {
      return res.status(403).send({ message: 'Require Citizen Role!' });
    }
    next();
  });
};

module.exports = {
  verifyToken,
  isAdmin,
  isOfficer,
  isCitizen,
};