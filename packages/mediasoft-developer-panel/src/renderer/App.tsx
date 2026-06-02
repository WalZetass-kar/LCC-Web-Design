import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Login from './pages/Login';
import AppLayout from './layouts/AppLayout';
import LicenseCenter from './pages/LicenseCenter';
import LicenseAdmin from './pages/LicenseAdmin';
import LicenseManagement from './pages/LicenseManagement';
import UserManagement from './pages/UserManagement';
import SubscriptionPlans from './pages/SubscriptionPlans';
import Security from './pages/Security';
import EcommerceApi from './pages/EcommerceApi';
import Assistant from './pages/Assistant';
import Tutorials from './pages/Tutorials';
import Backup from './pages/Backup';
import Settings from './pages/Settings';
import Users from './pages/Users';
import ActivityLog from './pages/ActivityLog';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
