import { useState, useEffect } from 'react';
import { Users, CreditCard, Smartphone, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import axiosInstance from '../../utils/axiosInstance';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalDevices: number;
  totalRevenue: number;
  expiringSubscriptions: number;
}

export default function AdminDashboard() {
  const { token, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && token) {
    fetchStats();
  }
}, [authLoading, token]);

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/admin/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const sendReminders = async () => {
    try {
      const response = await axios.post('/admin/send-reminders');
      toast.success(response.data.message);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send reminders';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and management</p>
        </div>

        <button
          onClick={sendReminders}
          className="btn-primary"
        >
          Send Expiry Reminders
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeSubscriptions || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalDevices || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(stats?.totalRevenue || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-error-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-error-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.expiringSubscriptions || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900">User Management</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            View and manage all registered users, their subscriptions, and account status.
          </p>
          <a href="/admin/dashboard/users" className="btn-primary w-full">
            Manage Users
          </a>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-success-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Subscriptions</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Monitor subscription status, renewals, and handle expiring accounts.
          </p>
          <a href="/admin/dashboard/subscriptions" className="btn-primary w-full">
            View Subscriptions
          </a>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-warning-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Device Management</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            View all registered devices, their status, and manage device assignments.
          </p>
          <a href="/admin/devices" className="btn-primary w-full">
            Manage Devices
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <h3 className="font-medium text-gray-900">System Status</h3>
            <p className="text-sm text-success-600">All systems operational</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="font-medium text-gray-900">Active Users</h3>
            <p className="text-sm text-gray-600">
              {Math.round((stats?.activeSubscriptions || 0) / (stats?.totalUsers || 1) * 100)}% subscription rate
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-warning-600" />
            </div>
            <h3 className="font-medium text-gray-900">Attention Needed</h3>
            <p className="text-sm text-warning-600">
              {stats?.expiringSubscriptions || 0} subscriptions expiring soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}