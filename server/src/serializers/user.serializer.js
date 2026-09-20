const UserSerializer = {
  serialize(user) {
    return {
      id: user.id,
      mobileNumber: user.mobileNumber,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    };
  },

  serializeMany(users) {
    return users.map(user => this.serialize(user));
  },
};

module.exports = UserSerializer;