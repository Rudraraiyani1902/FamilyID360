const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

const uuid = {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
};

const User = sequelize.define('User', {
  id: uuid,
  mobileNumber: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
    field: 'mobile_number',
    validate: { notEmpty: true },
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING,
    field: 'password_hash',
  },
  role: {
    type: DataTypes.ENUM('citizen', 'officer', 'admin'),
    allowNull: false,
    defaultValue: 'citizen',
  },
  status: {
    type: DataTypes.ENUM('active', 'blocked', 'pending'),
    allowNull: false,
    defaultValue: 'pending',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at',
  },
}, {
  tableName: 'users',
  indexes: [
    { unique: true, fields: ['mobile_number'] },
    { unique: true, fields: ['email'], where: { email: { [Op.ne]: null } } },
  ],
});

// Other models remain unchanged...

module.exports = {
  sequelize,
  User,
  // Export other models...
};