const validate = (rules) => (req, res, next) => {
  const errors = [];

  for (const rule of rules) {
    const value = req.body[rule.field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }

    if (value !== undefined && rule.type && typeof value !== rule.type) {
      errors.push(`${rule.field} must be a ${rule.type}`);
    }

    if (value !== undefined && rule.maxLength && String(value).length > rule.maxLength) {
      errors.push(`${rule.field} exceeds the maximum length`);
    }

    if (value !== undefined && rule.min !== undefined && Number(value) < rule.min) {
      errors.push(`${rule.field} must be at least ${rule.min}`);
    }
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

module.exports = { validate };