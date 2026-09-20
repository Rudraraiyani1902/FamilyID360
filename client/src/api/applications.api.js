import api from './axios';

export const getApplications = () => api.get('/applications');

export const createApplication = (payload) => api.post('/applications', payload);

export default {
  getApplications,
  createApplication,
};
