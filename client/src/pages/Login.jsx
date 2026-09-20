import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const { login, authLoading, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user was redirected from a protected route or session expired
  const from = location.state?.from?.pathname;
  const sessionExpiredMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (setAuthError) setAuthError(null);

    if (!mobileNumber || mobileNumber.length < 10) {
      setLocalError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      // 1. Connect to POST /api/auth/login
      const result = await login(mobileNumber, password);
      
      // 10. Redirect after login based on role or intended destination
      if (from && !from.includes('/login')) {
        navigate(from, { replace: true });
      } else if (result.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (result.role === 'officer') {
        navigate('/officer/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      // Error is set in AuthContext and formatted by Axios response interceptor
      setLocalError(err.clientMessage || err.response?.data?.message || 'Login failed. Please verify credentials.');
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-xl mb-4 border border-primary-400/30">
          <span className="text-white font-black text-2xl tracking-tighter">360</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">FamilyID 360</h1>
        <p className="mt-1 text-sm text-primary-200 font-medium tracking-wide uppercase">
          Government of Gujarat Welfare Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sign in to your account</h2>
            <p className="text-xs text-gray-500 mt-1">
              Enter your registered mobile number and password to access state entitlements.
            </p>
          </div>

          {sessionExpiredMessage && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          <ErrorMessage
            message={displayedError}
            onClose={() => {
              setLocalError(null);
              if (setAuthError) setAuthError(null);
            }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="mobileNumber">
                Registered Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
                  +91
                </div>
                <input
                  id="mobileNumber"
                  type="tel"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="10-digit mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  className="input pl-12"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full btn-primary justify-center py-2.5 mt-2 text-sm font-semibold shadow-md"
            >
              {authLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Verifying Credentials…</span>
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* User Guide Notes */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 mb-2">
              Gujarat Single Sign-On Access:
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Citizens are routed to their Family Welfare Dashboard upon authentication. Authorized government officers are routed to the District Verification Console.
            </p>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            Don't have an enrolled account?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
              Register Family
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
