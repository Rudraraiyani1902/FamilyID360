import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FamilyProvider } from './context/FamilyContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import FamilyDashboard from './pages/FamilyDashboard';
import FamilyProfile from './pages/FamilyProfile';
import FamilyMembers from './pages/FamilyMembers';
import Schemes from './pages/Schemes';
import SchemeDetails from './pages/SchemeDetails';
import EligibilityResults from './pages/EligibilityResults';
import Applications from './pages/Applications';
import OfficerDashboard from './pages/OfficerDashboard';
import OfficerFamilies from './pages/OfficerFamilies';
import OfficerFamilyDetails from './pages/OfficerFamilyDetails';
import OfficerApplications from './pages/OfficerApplications';
import OfficerAuditLogs from './pages/OfficerAuditLogs';
import AdminDashboard from './pages/AdminDashboard';
import Assistant from './pages/Assistant';

function RootRedirect() {
  const { isAuthenticated, role, initialLoading } = useAuth();

  if (initialLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (role === 'officer') {
    return <Navigate to="/officer/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FamilyProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Layout */}
            <Route element={<Layout />}>
              {/* CITIZEN Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['citizen', 'admin']} />}>
                <Route path="/dashboard" element={<FamilyDashboard />} />
                <Route path="/family" element={<FamilyProfile />} />
                <Route path="/profile" element={<Navigate to="/family" replace />} />
                <Route path="/members" element={<FamilyMembers />} />
                <Route path="/schemes" element={<Schemes />} />
                <Route path="/schemes/:id" element={<SchemeDetails />} />
                <Route path="/eligibility" element={<EligibilityResults />} />
                <Route path="/applications" element={<Applications />} />
                <Route path="/assistant" element={<Assistant />} />
              </Route>

              {/* OFFICER Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['officer', 'admin']} />}>
                <Route path="/officer/dashboard" element={<OfficerDashboard />} />
                <Route path="/officer/families" element={<OfficerFamilies />} />
                <Route path="/officer/families/:id" element={<OfficerFamilyDetails />} />
                <Route path="/officer/applications" element={<OfficerApplications />} />
                <Route path="/officer/audit-logs" element={<OfficerAuditLogs />} />
                <Route path="/officer" element={<Navigate to="/officer/dashboard" replace />} />
              </Route>

              {/* ADMIN Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>
            </Route>

            {/* Root & Fallback */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </FamilyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
