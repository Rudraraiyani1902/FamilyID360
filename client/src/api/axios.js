import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'fid360_auth_token';

// Read API URL from VITE_API_URL, fallback to /api (uses Vite proxy in development)
const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
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
        // Do not auto-logout if the 401 happened during the login request itself
        const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
        if (!isAuthRequest) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          window.dispatchEvent(new CustomEvent('auth:expired', {
            detail: { message: data?.message || 'Your session has expired. Please sign in again.' }
          }));
        }
      }

      // Format custom error message on error object for components to read directly
      error.clientMessage =
        data?.message ||
        data?.errors?.[0]?.msg ||
        (status === 403 ? 'Access forbidden. You lack required authorization.' : null) ||
        (status >= 500 ? 'A server error occurred. Please try again later.' : null) ||
        'An unexpected error occurred.';
    } else if (error.request) {
      error.clientMessage = 'Unable to connect to government server. Please check your network connection.';
    } else {
      error.clientMessage = error.message;
    }

    return Promise.reject(error);
  }
);

export default api;
