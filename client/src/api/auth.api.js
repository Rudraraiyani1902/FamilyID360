import api from './axios';

/**
 * Citizen & Officer Login
 * @param {string} mobileNumber 10-digit mobile
 * @param {string} password Account password
 */
export const login = (mobileNumber, password) =>
  api.post('/auth/login', { mobileNumber, password });

/**
 * Citizen / User Registration
 * @param {{ mobileNumber: string, email: string, password: string, role?: string }} userData
 */
export const register = (userData) =>
  api.post('/auth/register', userData);

/**
 * Fetch authenticated user identity and linked family record
 */
export const getMe = () =>
  api.get('/auth/me');
