const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  Family,
  FamilyMember,
  Scheme,
  SchemeDocument,
  Application,
  Document,
  AuditLog,
  User,
} = require('../models');
const { extractDocumentData } = require('../services/documentExtractionService');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const uploadsDirectory = path.resolve(__dirname, '../../storage/documents');
fs.mkdirSync(uploadsDirectory, { recursive: true });

const resolveUserFamily = async (userId) => {
  let family = await Family.findOne({
    where: { createdBy: userId },
    include: [{ model: FamilyMember, as: 'members', attributes: ['id', 'fullName', 'isFamilyHead'] }],
    order: [['createdAt', 'DESC']],
  });
  if (!family) {
    const member = await FamilyMember.findOne({ where: { userId }, attributes: ['familyId'] });
    if (member) family = await Family.findByPk(member.familyId, { include: [{ model: FamilyMember, as: 'members', attributes: ['id', 'fullName', 'isFamilyHead'] }] });
  }
  return family;
};

const expireDocuments = async (documents) => {
  const today = new Date().toISOString().slice(0, 10);
  return Promise.all(documents.map(async (document) => {
    if (document.expiryDate && document.expiryDate < today && document.status !== 'EXPIRED') {
      await document.update({ status: 'EXPIRED' });
    }
    return document;
  }));
};

const documentInclude = [
  { model: Family, as: 'family', attributes: ['id', 'familyIdNumber'] },
  { model: FamilyMember, as: 'member', attributes: ['id', 'fullName', 'relationToHead'] },
  { model: Application, as: 'application', attributes: ['id', 'applicationId', 'status'], include: [{ model: Scheme, as: 'scheme', attributes: ['id', 'code', 'name'] }] },
  { model: User, as: 'verifier', attributes: ['id', 'email', 'mobileNumber'] },
];

const safeDocument = (document) => {
  const value = document.toJSON ? document.toJSON() : { ...document };
  delete value.storageReference;
  return value;
};

const hasAllowedFileSignature = async (file) => {
  const bytes = await fs.promises.readFile(file.path);
  if (file.mimetype === 'application/pdf') return bytes.slice(0, 5).toString() === '%PDF-';
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
};

const writeAudit = async ({ document, action, previousState, newState, performedBy, notes }) => {
  const officer = await User.findByPk(performedBy, { attributes: ['email', 'mobileNumber', 'role'] });
  return AuditLog.create({
    entityType: 'DOCUMENT',
    entityId: document.id,
    action,
    previousState,
    newState,
    notes,
    performedBy,
    performedByRole: officer?.role || 'citizen',
    officerName: officer?.email || officer?.mobileNumber || 'Portal User',
  });
};

const compareExtractedData = ({ extractedData, family, member }) => {
  if (!extractedData) return [];
  const expectedName = member?.fullName || family?.familyIdNumber;
  if (!extractedData.name || !expectedName) return [];
  const normalize = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  return [{
    field: 'name',
    expected: expectedName,
    actual: extractedData.name,
    status: normalize(expectedName) === normalize(extractedData.name) ? 'MATCH' : 'MISMATCH',
  }];
};

const getMyDocuments = async (req, res, next) => {
  try {
    const family = await resolveUserFamily(req.user.id);
    if (!family) return res.json({ success: true, data: [] });
    const documents = await Document.findAll({ where: { familyId: family.id }, include: documentInclude, order: [['createdAt', 'DESC']] });
    await expireDocuments(documents);
    res.json({ success: true, data: documents.map(safeDocument) });
  } catch (error) {
    next(error);
  }
};

const getDocumentRequirements = async (req, res, next) => {
  try {
    const family = await resolveUserFamily(req.user.id);
    if (!family) return res.status(404).json({ message: 'No family profile found.' });
    const application = await Application.findOne({
      where: { id: req.params.applicationId, familyId: family.id },
      include: [{ model: Scheme, as: 'scheme', include: [{ model: SchemeDocument, as: 'documents' }] }],
    });
    if (!application) return res.status(404).json({ message: 'Application not found.' });
    const documents = await Document.findAll({ where: { familyId: family.id, applicationId: application.id }, include: documentInclude, order: [['createdAt', 'DESC']] });
    await expireDocuments(documents);
    const latestByType = new Map();
    documents.forEach((document) => {
      if (!latestByType.has(document.documentType)) latestByType.set(document.documentType, document);
    });
    const requirements = (application.scheme.documents || []).map((required) => {
      const submitted = latestByType.get(required.documentType);
      return {
        documentType: required.documentType,
        isRequired: required.isRequired,
        status: submitted?.status || 'MISSING',
        document: submitted ? safeDocument(submitted) : null,
      };
    });
    res.json({ success: true, application: { id: application.id, applicationId: application.applicationId, status: application.status, scheme: application.scheme }, requirements });
  } catch (error) {
    next(error);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'A PDF, JPG, JPEG, or PNG file is required.' });
    if (req.file.size > MAX_FILE_SIZE) return res.status(400).json({ message: 'Document file must be 10 MB or smaller.' });
    if (!(await hasAllowedFileSignature(req.file))) {
      fs.rm(req.file.path, { force: true }, () => {});
      return res.status(400).json({ message: 'The file content does not match an allowed PDF, JPG, JPEG, or PNG document.' });
    }

    const family = await resolveUserFamily(req.user.id);
    if (!family) {
      fs.rm(req.file.path, { force: true }, () => {});
      return res.status(400).json({ message: 'Create a family profile before uploading documents.' });
    }
    const { documentType, memberId, applicationId, replacementDocumentId } = req.body;
    if (!documentType?.trim()) {
      fs.rm(req.file.path, { force: true }, () => {});
      return res.status(400).json({ message: 'documentType is required.' });
    }

    let member = null;
    if (memberId) {
      member = await FamilyMember.findOne({ where: { id: memberId, familyId: family.id } });
      if (!member) {
        fs.rm(req.file.path, { force: true }, () => {});
        return res.status(403).json({ message: 'Member does not belong to your family.' });
      }
    }
    let application = null;
    if (applicationId) {
      application = await Application.findOne({ where: { id: applicationId, familyId: family.id }, include: [{ model: Scheme, as: 'scheme', include: [{ model: SchemeDocument, as: 'documents' }] }] });
      if (!application) {
        fs.rm(req.file.path, { force: true }, () => {});
        return res.status(403).json({ message: 'Application does not belong to your family.' });
      }
      const configuredTypes = (application.scheme.documents || []).map((document) => document.documentType);
      if (!configuredTypes.includes(documentType.trim())) {
        fs.rm(req.file.path, { force: true }, () => {});
        return res.status(400).json({ message: 'This document type is not configured for the selected scheme application.' });
      }
    }

    const extractedData = await extractDocumentData({ documentType: documentType.trim(), fileName: req.file.originalname, mimeType: req.file.mimetype }).catch((error) => {
      console.error('Document extraction unavailable:', error.message);
      return null;
    });
    const familyHead = family.members?.find((item) => item.isFamilyHead);
    const consistencyFlags = compareExtractedData({ extractedData, family, member: member || familyHead });
    const document = await Document.create({
      familyId: family.id,
      memberId: member?.id || null,
      applicationId: application?.id || null,
      documentType: documentType.trim(),
      documentName: req.file.originalname,
      storageReference: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      status: 'UNDER_REVIEW',
      extractedData,
      consistencyFlags,
      expiryDate: extractedData?.expiryDate || null,
    });
    await writeAudit({ document, action: 'DOCUMENT_UPLOADED', previousState: null, newState: { status: document.status, documentType: document.documentType }, performedBy: req.user.id, notes: 'Demo document uploaded for officer review.' });

    if (replacementDocumentId) {
      const replacement = await Document.findOne({ where: { id: replacementDocumentId, familyId: family.id } });
      if (replacement) await replacement.update({ status: 'REJECTED', rejectionReason: 'Replaced by a newer upload.' });
    }

    res.status(201).json({ success: true, message: 'Document uploaded and queued for review.', data: safeDocument(document) });
  } catch (error) {
    if (req.file?.path) fs.rm(req.file.path, { force: true }, () => {});
    next(error);
  }
};

const getCitizenDocument = async (req, res, next) => {
  try {
    const family = await resolveUserFamily(req.user.id);
    const document = await Document.findOne({ where: { id: req.params.id, familyId: family?.id }, include: documentInclude });
    if (!document) return res.status(404).json({ message: 'Document not found.' });
    await expireDocuments([document]);
    res.json({ success: true, data: safeDocument(document) });
  } catch (error) {
    next(error);
  }
};

const streamDocument = async (req, res, next) => {
  try {
    const family = await resolveUserFamily(req.user.id);
    const document = await Document.findOne({ where: { id: req.params.id, familyId: family?.id } });
    if (!document) return res.status(404).json({ message: 'Document not found.' });
    if (!fs.existsSync(document.storageReference)) return res.status(404).json({ message: 'Demo file is no longer available.' });
    res.type(document.mimeType).setHeader('Content-Disposition', `inline; filename="${path.basename(document.documentName)}"`);
    fs.createReadStream(document.storageReference).pipe(res);
  } catch (error) {
    next(error);
  }
};

const listOfficerDocuments = async (req, res, next) => {
  try {
    const { search = '', status = '', page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const where = status ? { status } : {};
    if (search.trim()) {
      where[Op.or] = [
        { documentType: { [Op.iLike]: `%${search.trim()}%` } },
        { documentName: { [Op.iLike]: `%${search.trim()}%` } },
        { '$family.family_id_number$': { [Op.iLike]: `%${search.trim()}%` } },
        { '$application.application_id$': { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }
    const result = await Document.findAndCountAll({ where, include: documentInclude, order: [['createdAt', 'DESC']], limit: pageLimit, offset: (pageNum - 1) * pageLimit, distinct: true });
    await expireDocuments(result.rows);
    res.json({ success: true, data: result.rows.map(safeDocument), pagination: { total: result.count, page: pageNum, limit: pageLimit, totalPages: Math.ceil(result.count / pageLimit) } });
  } catch (error) {
    next(error);
  }
};

const reviewDocument = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!['VERIFIED', 'REJECTED'].includes(status)) return res.status(400).json({ message: 'Review status must be VERIFIED or REJECTED.' });
    if (status === 'REJECTED' && !reason?.trim()) return res.status(400).json({ message: 'A rejection reason is required.' });
    const document = await Document.findByPk(req.params.id, { include: documentInclude });
    if (!document) return res.status(404).json({ message: 'Document not found.' });
    const previousStatus = document.status;
    await document.update({ status, verifiedAt: status === 'VERIFIED' ? new Date() : null, verifiedBy: req.user.id, rejectionReason: status === 'REJECTED' ? reason.trim() : null });
    await writeAudit({ document, action: status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED', previousState: { status: previousStatus }, newState: { status, reason: status === 'REJECTED' ? reason.trim() : null }, performedBy: req.user.id, notes: status === 'REJECTED' ? reason.trim() : 'Document verified by authorized officer.' });
    if (status === 'VERIFIED' && document.applicationId) await updateApplicationAfterVerification(document.applicationId);
    res.json({ success: true, message: `Document ${status.toLowerCase()} and audit entry recorded.`, data: safeDocument(document) });
  } catch (error) {
    next(error);
  }
};

const updateApplicationAfterVerification = async (applicationId) => {
  const application = await Application.findByPk(applicationId, { include: [{ model: Scheme, as: 'scheme', include: [{ model: SchemeDocument, as: 'documents' }] }] });
  if (!application || application.status !== 'DOCUMENT_REQUIRED') return;
  const documents = await Document.findAll({ where: { applicationId, status: 'VERIFIED' } });
  const verifiedTypes = new Set(documents.map((document) => document.documentType));
  const required = (application.scheme.documents || []).filter((document) => document.isRequired);
  if (required.every((document) => verifiedTypes.has(document.documentType))) await application.update({ status: 'UNDER_REVIEW' });
};

const getOfficerDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id, { include: documentInclude });
    if (!document) return res.status(404).json({ message: 'Document not found.' });
    await expireDocuments([document]);
    res.json({ success: true, data: safeDocument(document) });
  } catch (error) {
    next(error);
  }
};

const streamOfficerDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document || !fs.existsSync(document.storageReference)) return res.status(404).json({ message: 'Document file not found.' });
    res.type(document.mimeType).setHeader('Content-Disposition', `inline; filename="${path.basename(document.documentName)}"`);
    fs.createReadStream(document.storageReference).pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadsDirectory,
  MAX_FILE_SIZE,
  getMyDocuments,
  getDocumentRequirements,
  uploadDocument,
  getCitizenDocument,
  streamDocument,
  listOfficerDocuments,
  getOfficerDocument,
  streamOfficerDocument,
  reviewDocument,
};
