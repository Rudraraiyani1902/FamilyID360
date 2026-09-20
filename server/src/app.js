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
const documentRoutes = require('./routes/document.routes');

const app = express();

// CORS: allow origins declared in CORS_ORIGIN, or any localhost / vercel.app domains
const envOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // allow non-browser / server-to-server requests
  if (envOrigins.includes('*') || envOrigins.includes(origin)) return true;
  // Automatically allow any vercel.app deployment and localhost ports
  if (origin.endsWith('.vercel.app')) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} is not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check endpoints for Render and monitoring
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'FamilyID360 API', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'FamilyID 360 API is running', docs: '/api' });
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api', eligibilityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Document file must be 10 MB or smaller.' });
  }
  if (err.message === 'Only PDF, JPG, JPEG, and PNG files are allowed.') {
    return res.status(400).json({ message: err.message });
  }

  // Sequelize Validation Errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errorList = err.errors?.map((e) => ({
      field: e.path,
      message: e.message,
    })) || [];
    return res.status(400).json({
      message: errorList[0]?.message || 'Database validation failed.',
      errors: errorList,
    });
  }

  // Database Connection / Execution Errors
  if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeConnectionError') {
    return res.status(500).json({
      message: 'Database service encountered an issue. Please verify database connectivity.',
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
  }

  // JSON Body Parse Error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON payload in request body.' });
  }

  const errorMessage = err.message || 'An internal server error occurred.';
  res.status(err.status || 500).json({
    message: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

module.exports = app;