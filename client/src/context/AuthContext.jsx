import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, getMe as apiGetMe } from '../api/auth.api';
import { TOKEN_STORAGE_KEY } from '../api/axios';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'fid360_user_meta';

// Helper to decode JWT payload without external libraries
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY) || null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [familyIdNumber, setFamilyIdNumber] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Clear all credentials
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setRole(null);
    setFamilyId(null);
    setFamilyIdNumber(null);
    setIsAuthenticated(false);
  }, []);

  // ── 11. On Startup: Restore/Check Current Authentication State with Backend ─
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setInitialLoading(false);
        return;
      }

      // Check client-side JWT expiration first
      const payload = decodeToken(storedToken);
      if (payload && payload.exp && payload.exp * 1000 < Date.now()) {
        clearAuth();
        setInitialLoading(false);
        return;
      }

      try {
        // Validate against existing backend authentication endpoint
        const res = await apiGetMe();
        const userData = res.data.user;
        setUser(userData);
        setRole(userData.role);
        setFamilyId(res.data.familyId || null);
        setFamilyIdNumber(res.data.familyIdNumber || null);
        setToken(storedToken);
        setIsAuthenticated(true);
      } catch (err) {
        // If 401 or invalid, clear token; otherwise, if server is temporarily unreachable, fallback to decoded payload
        if (err.response?.status === 401 || err.response?.status === 403) {
          clearAuth();
        } else if (payload) {
          // Graceful offline/startup recovery
          setUser({ id: payload.id, role: payload.role });
          setRole(payload.role);
          setToken(storedToken);
          setIsAuthenticated(true);
        } else {
          clearAuth();
        }
      } finally {
        setInitialLoading(false);
      }
    };

    restoreSession();

    // Listen for 401 unauthorized events from Axios response interceptor
    const handleExpired = (e) => {
      clearAuth();
      setAuthError(e.detail?.message || 'Session expired. Please sign in again.');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [clearAuth]);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (mobileNumber, password) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      // 1. Connect to POST /api/auth/login
      const res = await apiLogin(mobileNumber, password);
      const jwtToken = res.data.token;

      if (!jwtToken) {
        throw new Error('No authentication token returned by backend.');
      }

      // 2. Persist Bearer token
      localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
      sessionStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
      setToken(jwtToken);

      // 3. Fetch full profile and associated Family ID from backend
      try {
        const meRes = await apiGetMe();
        const userData = meRes.data.user;
        setUser(userData);
        setRole(userData.role);
        setFamilyId(meRes.data.familyId || null);
        setFamilyIdNumber(meRes.data.familyIdNumber || null);
        setIsAuthenticated(true);
        return { user: userData, role: userData.role, familyId: meRes.data.familyId };
      } catch {
        // Fallback: decode JWT payload if /me has an issue
        const payload = decodeToken(jwtToken) || {};
        const fallbackUser = { id: payload.id, role: payload.role, mobileNumber };
        setUser(fallbackUser);
        setRole(payload.role || 'citizen');
        setIsAuthenticated(true);
        return { user: fallbackUser, role: payload.role || 'citizen', familyId: null };
      }
    } catch (err) {
      const msg = err.clientMessage || err.response?.data?.message || 'Invalid mobile number or password.';
      setAuthError(msg);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await apiRegister(formData);
      return res.data;
    } catch (err) {
      const msg = err.clientMessage || err.response?.data?.message || 'Registration failed.';
      setAuthError(msg);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const hasRole = (...roles) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        familyId,
        familyIdNumber,
        isAuthenticated,
        initialLoading,
        authLoading,
        authError,
        setAuthError,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
