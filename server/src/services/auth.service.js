const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const config = require('../config/auth');

const register = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = await User.create({ ...userData, passwordHash: hashedPassword });
  return user;
};

const login = async (mobileNumber, password) => {
  const user = await User.findOne({ where: { mobileNumber } });
  if (!user) {
    throw new Error('User not found');
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }
  
  const token = jwt.sign({ id: user.id, role: user.role }, config.secret, {
    expiresIn: config.tokenExpiration,
  });
  
  return { user, token };
};

const verifyToken = (token) => {
  return jwt.verify(token, config.secret);
};

const getUserById = async (id) => {
  return await User.findByPk(id);
};

module.exports = {
  register,
  login,
  verifyToken,
  getUserById,
};