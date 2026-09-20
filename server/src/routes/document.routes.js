const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const {
  uploadsDirectory,
  MAX_FILE_SIZE,
  getMyDocuments,
  getDocumentRequirements,
  uploadDocument,
  getCitizenDocument,
  streamDocument,
} = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth.middleware');

const allowedTypes = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDirectory),
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.get(file.mimetype) !== extension) return callback(new Error('Only PDF, JPG, JPEG, and PNG files are allowed.'));
    callback(null, true);
  },
});

const router = express.Router();
router.use(authenticate);

router.get('/', getMyDocuments);
router.get('/requirements/:applicationId', getDocumentRequirements);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:id/file', streamDocument);
router.get('/:id', getCitizenDocument);

module.exports = router;
