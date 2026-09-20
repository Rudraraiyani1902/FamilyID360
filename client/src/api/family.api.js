import api from './axios';

/**
 * Create a new household family record for the authenticated user
 * @param {{ addressId: string, annualIncome?: number, members?: Array }} data
 */
export const createFamily = (data) =>
  api.post('/families', data);

/**
 * Retrieve the authenticated user's family record from PostgreSQL
 * (never accepts arbitrary family ID from client)
 */
export const getMyFamily = () =>
  api.get('/families/me');

/**
 * Update the authenticated user's family profile
 * @param {{ addressId?: string, annualIncome?: number, status?: string }} data
 */
export const updateMyFamily = (data) =>
  api.put('/families/me', data);

/**
 * Get a family by ID (used by verification officers)
 */
export const getFamily = (familyId) =>
  api.get(`/families/${familyId}`);

/**
 * Update a family by ID (used by verification officers)
 */
export const updateFamily = (familyId, data) =>
  api.put(`/families/${familyId}`, data);
