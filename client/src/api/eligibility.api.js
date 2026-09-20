import api from './axios';

// Self-service citizen eligibility evaluation (secure, uses JWT req.user.id)
export const getMyEligibility = (documents = []) =>
  api.post('/families/me/eligibility', { documents });

export const getMySchemeEligibility = (schemeId, documents = []) =>
  api.post(`/families/me/eligibility/${schemeId}`, { documents });

// Legacy / admin evaluation endpoints
export const evaluateEligibility = (familyId, documents = []) =>
  api.post(`/families/${familyId}/eligibility`, { documents });

export const evaluateOneScheme = (familyId, schemeId, documents = []) =>
  api.post(`/families/${familyId}/eligibility/${schemeId}`, { documents });

export const evaluateAll = getMyEligibility;

export default {
  getMyEligibility,
  getMySchemeEligibility,
  evaluateEligibility,
  evaluateOneScheme,
  evaluateAll,
};
