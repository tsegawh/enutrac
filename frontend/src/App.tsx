import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import OAuthSuccess from './pages/OAuthSuccess';
// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Pages (lazy loaded)
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const About = React.lazy(() => import('./pages/About'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Devices = React.lazy(() => import('./pages/Devices'));
const PaymentSuccess = React.lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = React.lazy(() => import('./pages/PaymentCancel'));
const OrderReports = React.lazy(() => import('./pages/OrderReports'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Account = React.lazy(() => import('./pages/Account'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const SupportedDevices = React.lazy(() => import('./pages/SupportedDevices'));

// Admin Pages
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminReports = React.lazy(() => import('./pages/admin/AdminReports'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminSubscriptions = React.lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminDevices = React.lazy(() => import('./pages/admin/AdminDevices'));
const AdminPayments = React.lazy(() => import('./pages/admin/AdminPayments'));
const AdminOrderReports = React.lazy(() => import('./pages/admin/AdminOrderReports'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-gray-50">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/oauth-success" element={<OAuthSuccess />}/>
                  <Route path="/about" element={<About />} />
                  <Route path="/supported-devices" element={<SupportedDevices />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/cancel" element={<PaymentCancel />} />

                  {/* Protected Routes with Layout */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Layout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="devices" element={<Devices />} />
                    <Route path="orders" element={<OrderReports />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="account" element={<Account />} />
                  </Route>

                  {/* Admin Routes with Layout */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <Layout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                      </AdminRoute>
                    }
                  >
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="dashboard/users" element={<AdminUsers />} />
                    <Route path="dashboard/subscriptions" element={<AdminSubscriptions />} />
                    <Route path="dashboard/devices" element={<AdminDevices />} />
                    <Route path="dashboard/payments" element={<AdminPayments />} />
                    <Route path="dashboard/reports" element={<AdminReports />} />
                    <Route path="dashboard/adminorders" element={<AdminOrderReports />} />
                    <Route path="dashboard/settings" element={<AdminSettings />} />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#fff',
                    color: '#374151',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                  },
                }}
              />
            </div>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;