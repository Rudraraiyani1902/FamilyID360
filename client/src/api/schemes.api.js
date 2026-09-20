import api from './axios';

export const getSchemes = () => api.get('/schemes');

export const getScheme = (id) => api.get(`/schemes/${id}`);

export default {
  getSchemes,
  getScheme,
};
