import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterInstitutionPage } from './pages/auth/RegisterInstitutionPage';
import { DashboardPage } from './pages/dashboards/DashboardPage';
import { FDRListPage } from './pages/fdr/FDRListPage';
import { CreateFDRPage } from './pages/fdr/CreateFDRPage';
import { FDRDetailPage } from './pages/fdr/FDRDetailPage';
import { VerificationQueuePage } from './pages/verification/VerificationQueuePage';
import { ApprovalQueuePage } from './pages/approvals/ApprovalQueuePage';
import { MaturityCalendarPage } from './pages/maturity/MaturityCalendarPage';
import { RenewalsPage } from './pages/renewals/RenewalsPage';
import { ReleasesPage } from './pages/releases/ReleasesPage';
import { InstitutionListPage } from './pages/institutions/InstitutionListPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import { SystemSettingsPage } from './pages/settings/SystemSettingsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs">
        Loading AICTE Security Gateway...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-institution" element={<RegisterInstitutionPage />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="fdrs" element={<FDRListPage />} />
            <Route path="fdrs/new" element={<CreateFDRPage />} />
            <Route path="fdrs/:id" element={<FDRDetailPage />} />
            <Route path="verification" element={<VerificationQueuePage />} />
            <Route path="approvals" element={<ApprovalQueuePage />} />
            <Route path="maturity" element={<MaturityCalendarPage />} />
            <Route path="renewals" element={<RenewalsPage />} />
            <Route path="releases" element={<ReleasesPage />} />
            <Route path="institutions" element={<InstitutionListPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit" element={<AuditLogsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
