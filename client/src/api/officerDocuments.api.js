import api from './axios';

export const getOfficerDocuments = (params) => api.get('/officer/documents', { params });
export const getOfficerDocument = (id) => api.get(`/officer/documents/${id}`);
export const reviewDocument = (id, payload) => api.put(`/officer/documents/${id}/review`, payload);
export const getOfficerDocumentFile = (id) => api.get(`/officer/documents/${id}/file`, { responseType: 'blob' });

export default { getOfficerDocuments, getOfficerDocument, reviewDocument, getOfficerDocumentFile };
