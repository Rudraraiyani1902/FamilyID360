import api from './axios';

export const getMyDocuments = () => api.get('/documents');
export const getDocumentRequirements = (applicationId) => api.get(`/documents/requirements/${applicationId}`);
export const getDocument = (id) => api.get(`/documents/${id}`);
export const getDocumentFile = (id) => api.get(`/documents/${id}/file`, { responseType: 'blob' });

export const uploadDocument = (payload, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('documentType', payload.documentType);
  if (payload.memberId) formData.append('memberId', payload.memberId);
  if (payload.applicationId) formData.append('applicationId', payload.applicationId);
  if (payload.replacementDocumentId) formData.append('replacementDocumentId', payload.replacementDocumentId);
  return api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
};

export default {
  getMyDocuments,
  getDocumentRequirements,
  getDocument,
  getDocumentFile,
  uploadDocument,
};
