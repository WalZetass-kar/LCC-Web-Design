import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { SkeletonSpinner } from './components/Skeleton';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const AppLayout = lazy(() => import('./layouts/AppLayout'));
const LicenseCenter = lazy(() => import('./pages/LicenseCenter'));
const LicenseAdmin = lazy(() => import('./pages/LicenseAdmin'));
const LicenseManagement = lazy(() => import('./pages/LicenseManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
const Security = lazy(() => import('./pages/Security'));
const EcommerceApi = lazy(() => import('./pages/EcommerceApi'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Tutorials = lazy(() => import('./pages/Tutorials'));
const Backup = lazy(() => import('./pages/Backup'));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<SkeletonSpinner label="Memuat panel..." />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<LicenseManagement />} />
                  <Route path="license" element={<LicenseCenter />} />
                  <Route path="license-management" element={<LicenseManagement />} />
                  <Route path="user-management" element={<UserManagement />} />
                  <Route path="license-admin" element={<LicenseAdmin />} />
                  <Route path="subscription-plans" element={<SubscriptionPlans />} />
                  <Route path="security" element={<Security />} />
                  <Route path="ecommerce-api" element={<EcommerceApi />} />
                  <Route path="assistant" element={<Assistant />} />
                  <Route path="tutorials" element={<Tutorials />} />
                  <Route path="backup" element={<Backup />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="users" element={<Users />} />
                  <Route path="activity-log" element={<ActivityLog />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
