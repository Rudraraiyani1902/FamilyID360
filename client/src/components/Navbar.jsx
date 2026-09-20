import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';

export default function Navbar({ onMenuToggle }) {
  const { user, role, logout, familyIdNumber: authFamilyIdNumber } = useAuth();
  const { family } = useFamily();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayedFamilyId = family?.familyIdNumber || authFamilyIdNumber;

  const roleColor = {
    officer: 'bg-purple-100 text-purple-800 border-purple-200',
    admin: 'bg-red-100 text-red-800 border-red-200',
    citizen: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }[role] || 'bg-gray-100 text-gray-800';

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
          aria-label="Toggle navigation"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Family ID badge if citizen has a family */}
        {displayedFamilyId && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary-50 rounded-lg border border-primary-100 text-xs font-medium text-primary-800">
            <span className="text-gray-400 font-normal">Family ID:</span>
            <span className="font-mono font-bold text-primary-700">{displayedFamilyId}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* User profile dropdown / info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-gray-900">{user?.mobileNumber}</div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border ${roleColor}`}>
                {role ? role.toUpperCase() : 'USER'}
              </span>
            </div>
          </div>

          <div className="w-9 h-9 rounded-full bg-primary-100 border border-primary-200 text-primary-700 flex items-center justify-center font-bold text-sm">
            {role === 'officer' ? 'OF' : 'CZ'}
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Sign out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
