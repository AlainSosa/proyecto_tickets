import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TicketsPage } from './pages/tickets/TicketsPage';
import { MyTicketStatusPage } from './pages/tickets/MyTicketStatusPage';
import { TicketDetailPage } from './pages/tickets/TicketDetailPage';
import { AssetsPage } from './pages/assets/AssetsPage';
import { NetworkPage } from './pages/network/NetworkPage';
import { TelephonyPage } from './pages/telephony/TelephonyPage';
import { MaintenancePage } from './pages/maintenance/MaintenancePage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { UsersPage } from './pages/users/UsersPage';
import { AuditPage } from './pages/audit/AuditPage';
import { AutoCapitalizeTextInputs } from './components/shared/AutoCapitalizeTextInputs';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'user') return <Navigate to="/tickets" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
          <AutoCapitalizeTextInputs>
            <ScrollToTop />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  fontSize: '14px',
                  borderRadius: '12px',
                },
              }}
            />
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RootRedirect />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'technician']}><DashboardPage /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute roles={['admin', 'technician', 'user']}><TicketsPage /></ProtectedRoute>} />
              <Route path="/my-ticket-status" element={<ProtectedRoute roles={['user']}><MyTicketStatusPage /></ProtectedRoute>} />
              <Route path="/tickets/:id" element={<ProtectedRoute roles={['admin', 'technician', 'user']}><TicketDetailPage /></ProtectedRoute>} />
              <Route
                path="/assets"
                element={
                  <ProtectedRoute roles={['admin', 'technician']}>
                    <AssetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/network"
                element={
                  <ProtectedRoute roles={['admin', 'technician']}>
                    <NetworkPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/telephony"
                element={
                  <ProtectedRoute roles={['admin', 'technician']}>
                    <TelephonyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/maintenance"
                element={
                  <ProtectedRoute roles={['admin', 'technician']}>
                    <MaintenancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute roles={['admin', 'technician']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<RootRedirect />} />
            </Routes>
          </AutoCapitalizeTextInputs>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
