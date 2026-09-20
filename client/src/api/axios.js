import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'fid360_auth_token';

// Read API URL from VITE_API_URL, fallback to /api (uses Vite proxy in development)
let apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
if (typeof apiBaseUrl === 'string' && apiBaseUrl.startsWith('http') && !apiBaseUrl.endsWith('/api') && !apiBaseUrl.endsWith('/api/')) {
  apiBaseUrl = apiBaseUrl.replace(/\/+$/, '') + '/api';
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000, // 60s to accommodate cloud container wake-ups
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach Bearer Token ──────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Global Error Handling ───────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized / Token Expired
      if (status === 401) {
        const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
        if (!isAuthRequest) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          window.dispatchEvent(new CustomEvent('auth:expired', {
            detail: { message: data?.message || 'Your session has expired. Please sign in again.' }
          }));
        }
      }

      // Extract detailed error messages
      let msg = null;
      let validationErrors = [];

      if (data) {
        if (typeof data === 'string') {
          msg = data;
        } else if (Array.isArray(data.errors) && data.errors.length > 0) {
          validationErrors = data.errors.map(e => e.msg || e.message || String(e));
          msg = data.message || validationErrors.join(' • ');
        } else {
          msg = data.message || data.error || data.msg;
        }
      }

      if (!msg) {
        if (status === 400) msg = 'Invalid request. Please check submitted details.';
        else if (status === 401) msg = 'Invalid credentials or unauthorized access.';
        else if (status === 403) msg = 'Access forbidden. You do not have permission for this action.';
        else if (status === 404) msg = 'The requested resource was not found on the server.';
        else if (status === 409) msg = 'Conflict detected. This record may already exist.';
        else if (status >= 500) msg = 'Government server error occurred. Please try again in a moment.';
        else msg = 'An unexpected error occurred.';
      }

      error.clientMessage = msg;
      error.errors = validationErrors.length > 0 ? validationErrors : (data?.errors || []);
    } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      error.clientMessage = 'Server response took longer than expected. If the backend is waking up, please retry shortly.';
    } else if (error.request) {
      error.clientMessage = 'Unable to connect to server. Please check your internet connection or verify that the backend is running.';
    } else {
      error.clientMessage = error.message || 'An unexpected error occurred.';
    }

    return Promise.reject(error);
  }
);

export default api;
