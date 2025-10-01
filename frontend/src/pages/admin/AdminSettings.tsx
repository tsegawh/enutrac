
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Settings, Save, Database, Mail, Smartphone } from 'lucide-react';

interface SystemSettings {
  traccarUrl: string;
  traccarUser: string;
  emailEnabled: boolean;
  maintenanceMode: boolean;
  maxDevicesPerUser: number;
  subscriptionPlans: Array<{
    name: string;
    price: number;
    devices: number;
    features: string[];
  }>;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    traccarUrl: '',
    traccarUser: '',
    emailEnabled: false,
    maintenanceMode: false,
    maxDevicesPerUser: 5,
    subscriptionPlans: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/settings');
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put('/admin/settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testTraccarConnection = async () => {
    try {
      const response = await axios.post('/admin/test-traccar');
      if (response.data.success) {
        toast.success('Traccar connection successful');
      } else {
        toast.error('Traccar connection failed');
      }
    } catch (error) {
      toast.error('Failed to test Traccar connection');
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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </div>
        
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-primary flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Traccar Configuration */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Traccar Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Traccar Server URL
            </label>
            <input
              type="url"
              value={settings.traccarUrl}
              onChange={(e) => setSettings({ ...settings, traccarUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://demo4.traccar.org"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Traccar Username
            </label>
            <input
              type="text"
              value={settings.traccarUser}
              onChange={(e) => setSettings({ ...settings, traccarUser: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="admin"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={testTraccarConnection}
            className="btn-secondary"
          >
            Test Connection
          </button>
        </div>
      </div>

      {/* Device Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Device Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Devices per User
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.maxDevicesPerUser}
              onChange={(e) => setSettings({ ...settings, maxDevicesPerUser: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Email Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Email Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="emailEnabled"
              checked={settings.emailEnabled}
              onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="emailEnabled" className="text-sm font-medium text-gray-700">
              Enable email notifications
            </label>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="maintenanceMode" className="text-sm font-medium text-gray-700">
              Enable maintenance mode
            </label>
            <span className="text-xs text-gray-500">
              (Prevents new user registrations and limits access)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
