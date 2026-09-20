import api from './axios';

export const getMembers = (familyId) =>
  api.get(`/families/${familyId}/members`);

export const addMember = (familyId, data) =>
  api.post(`/families/${familyId}/members`, data);

export const updateMember = (familyId, memberId, data) =>
  api.put(`/families/${familyId}/members/${memberId}`, data);

export const deleteMember = (familyId, memberId) =>
  api.delete(`/families/${familyId}/members/${memberId}`);

export const removeMember = deleteMember;
