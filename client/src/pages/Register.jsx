import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Register() {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'citizen',
  });
  const [localError, setLocalError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { register, login, authLoading, authError, setAuthError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (setAuthError) setAuthError(null);

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      // 2. Connect to POST /api/auth/register
      await register({
        mobileNumber: formData.mobileNumber,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      setSuccess(true);

      // Auto login after successful registration
      setTimeout(async () => {
        try {
          await login(formData.mobileNumber, formData.password);
          if (formData.role === 'officer') {
            navigate('/officer/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } catch {
          navigate('/login', { replace: true });
        }
      }, 1200);
    } catch (err) {
      setLocalError(err.clientMessage || err.response?.data?.message || 'Registration failed.');
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
          Citizen Family Enrollment
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create Citizen Account</h2>
            <p className="text-xs text-gray-500 mt-1">
              Enroll to access Gujarat welfare schemes & check family entitlements.
            </p>
          </div>

          <ErrorMessage
            message={displayedError}
            onClose={() => {
              setLocalError(null);
              if (setAuthError) setAuthError(null);
            }}
          />

          {success ? (
            <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-center space-y-2">
              <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="font-bold text-base">Registration Successful!</h3>
              <p className="text-xs text-green-700">Logging you in and preparing your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="mobileNumber">
                  10-Digit Mobile Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
                    +91
                  </div>
                  <input
                    id="mobileNumber"
                    type="tel"
                    name="mobileNumber"
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="9876543210"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, '') })}
                    className="input pl-12"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="email">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  placeholder="citizen@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="label" htmlFor="password">
                  Password (min. 6 characters) *
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="label" htmlFor="confirmPassword">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="label" htmlFor="role">
                  Account Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input font-medium"
                >
                  <option value="citizen">Citizen (Family Head)</option>
                  <option value="officer">Government Verification Officer</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full btn-primary justify-center py-2.5 mt-2 text-sm font-semibold shadow-md"
              >
                {authLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Enrolling Account…</span>
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
