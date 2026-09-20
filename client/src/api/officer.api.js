import api from './axios';

export const getDashboardStats = () => api.get('/officer/dashboard/stats');

export const searchFamilies = (params) => api.get('/officer/families', { params });

export const getFamilyDetails = (id) => api.get(`/officer/families/${id}`);

export const updateFamilyVerification = (id, payload) =>
  api.put(`/officer/families/${id}/verify`, payload);

export const flagFamilyQuality = (id, payload) =>
  api.post(`/officer/families/${id}/flag`, payload);

export const getDuplicateRecords = () => api.get('/officer/duplicates');

export const handleDuplicateDecision = (id, payload) =>
  api.post(`/officer/duplicates/${id}/decision`, payload);

export const getDataQualityIssues = () => api.get('/officer/data-quality');

export const getOfficerApplications = (params) => api.get('/officer/applications', { params });

export const updateApplicationStatus = (id, payload) =>
  api.put(`/officer/applications/${id}/status`, payload);

export const getAuditLogs = (params) => api.get('/officer/audit-logs', { params });

export default {
  getDashboardStats,
  searchFamilies,
  getFamilyDetails,
  updateFamilyVerification,
  flagFamilyQuality,
  getDuplicateRecords,
  handleDuplicateDecision,
  getDataQualityIssues,
  getOfficerApplications,
  updateApplicationStatus,
  getAuditLogs,
};
