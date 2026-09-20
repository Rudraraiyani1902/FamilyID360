const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const familyRoutes = require('./routes/family.routes');
const eligibilityRoutes = require('./routes/eligibility.routes');
const schemeRoutes = require('./routes/scheme.routes');
const applicationRoutes = require('./routes/application.routes');
const officerRoutes = require('./routes/officer.routes');
const assistantRoutes = require('./routes/assistant.routes');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api', eligibilityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

module.exports = app;