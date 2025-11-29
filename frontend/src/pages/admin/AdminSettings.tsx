import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Settings, Save, Database, Mail, Smartphone, Play, RefreshCw } from 'lucide-react';

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

interface CronSettings {
  cronEnabled: boolean;
  cronSchedule: string;
  cronCutoffHours: number;
  subscriptionCronEnabled: boolean;
  subscriptionCronScheduleExpire: string;
  subscriptionCronScheduleReminder: string;
  maintenanceCronEnabled: boolean;
  maintenanceCronSchedule: string;
  reportCronEnabled: boolean;
  reportCronScheduleWeekly: string;
}

interface CronJobStatus {
  [key: string]: {
    schedule: string;
    running: boolean;
    lastRun?: string;
    description: string;
  };
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

  const [cronSettings, setCronSettings] = useState<CronSettings>({
    cronEnabled: false,
    cronSchedule: '0 * * * *',
    cronCutoffHours: 24,
    subscriptionCronEnabled: false,
    subscriptionCronScheduleExpire: '0 9 * * *',
    subscriptionCronScheduleReminder: '0 9 * * *',
    maintenanceCronEnabled: false,
    maintenanceCronSchedule: '0 * * * *',
    reportCronEnabled: false,
    reportCronScheduleWeekly: '0 0 * * 0',
  });

  const [cronStatus, setCronStatus] = useState<CronJobStatus>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCron, setSavingCron] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchCronStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/settings');
      const allSettings = response.data.settings;
      
      // Extract general settings
      const generalSettings: SystemSettings = {
        traccarUrl: allSettings.traccarUrl || '',
        traccarUser: allSettings.traccarUser || '',
        emailEnabled: allSettings.emailEnabled === 'true',
        maintenanceMode: allSettings.maintenanceMode === 'true',
        maxDevicesPerUser: parseInt(allSettings.maxDevicesPerUser || '5'),
        subscriptionPlans: allSettings.subscriptionPlans ? JSON.parse(allSettings.subscriptionPlans) : []
      };

      // Extract cron settings
      const cronConfig: CronSettings = {
        cronEnabled: allSettings.cronEnabled === 'true',
        cronSchedule: allSettings.cronSchedule || '0 * * * *',
        cronCutoffHours: parseInt(allSettings.cronCutoffHours || '24'),
        subscriptionCronEnabled: allSettings.subscriptionCronEnabled === 'true',
        subscriptionCronScheduleExpire: allSettings.subscriptionCronScheduleExpire || '0 9 * * *',
        subscriptionCronScheduleReminder: allSettings.subscriptionCronScheduleReminder || '0 9 * * *',
        maintenanceCronEnabled: allSettings.maintenanceCronEnabled === 'true',
        maintenanceCronSchedule: allSettings.maintenanceCronSchedule || '0 * * * *',
        reportCronEnabled: allSettings.reportCronEnabled === 'true',
        reportCronScheduleWeekly: allSettings.reportCronScheduleWeekly || '0 0 * * 0',
      };

      setSettings(generalSettings);
      setCronSettings(cronConfig);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const response = await axios.get('/admin/cron-status');
      setCronStatus(response.data.cronStatus || {});
    } catch (error) {
      console.error('Error fetching cron status:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put('/admin/settings', { settings });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveCronSettings = async () => {
    try {
      setSavingCron(true);
      await axios.put('/admin/cron-settings', { settings: cronSettings });
      toast.success('Cron settings saved successfully');
      await fetchCronStatus();
    } catch (error) {
      console.error('Error saving cron settings:', error);
      toast.error('Failed to save cron settings');
    } finally {
      setSavingCron(false);
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

  const triggerCronJob = async (jobName: string) => {
    try {
      const response = await axios.post(`/admin/cron/trigger/${jobName}`);
      if (response.data.success) {
        toast.success(response.data.message || `Cron job "${jobName}" executed successfully`);
        await fetchCronStatus();
      } else {
        toast.error(response.data.message || `Failed to trigger cron job: ${jobName}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to trigger cron job: ${jobName}`);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setTestingEmail(true);
      const response = await axios.post('/admin/test-email', { email: testEmailAddress });
       withCredentials: true // This is crucial for cookies
      if (response.data.success) {
        toast.success('Test email sent successfully');
        setTestEmailAddress('');
      } else {
        toast.error('Failed to send test email');
      }
    } catch (error) {
      toast.error('Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const getCronJobDisplayName = (jobName: string) => {
    const names: { [key: string]: string } = {
      'paymentCleanup': 'Payment Cleanup',
      'subscriptionExpire': 'Subscription Expiry',
      'subscriptionReminder': 'Subscription Reminders',
      'maintenance': 'Maintenance Cleanup',
      'weeklyStats': 'Weekly Statistics'
    };
    return names[jobName] || jobName;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
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
        
       
      </div>

      {/* Cron Jobs Status Panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Cron Jobs Status</h2>
          </div>
          <button
            onClick={fetchCronStatus}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-3">
          {Object.keys(cronStatus).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active cron jobs</p>
          ) : (
            Object.entries(cronStatus).map(([jobName, status]) => (
              <div key={jobName} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${status.running ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium text-gray-900">
                      {getCronJobDisplayName(jobName)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{status.description}</p>
                  <p className="text-sm text-gray-500">Schedule: <code className="bg-gray-200 px-1 rounded">{status.schedule}</code></p>
                  {status.lastRun && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last run: {new Date(status.lastRun).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${status.running ? 'text-green-600' : 'text-red-600'}`}>
                    {status.running ? 'Running' : 'Stopped'}
                  </span>
                  <button
                    onClick={() => triggerCronJob(jobName)}
                    className="btn-secondary flex items-center space-x-1 text-xs"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run Now</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cron Job Settings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Cron Job Settings</h2>
          </div>
          <button
            onClick={saveCronSettings}
            disabled={savingCron}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{savingCron ? 'Saving...' : 'Save Cron Settings'}</span>
          </button>
        </div>

        <div className="space-y-6">
          {/* Payment Cleanup */}
          <div className="border-b pb-4">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Payment Cleanup</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="cronEnabled"
                  checked={cronSettings.cronEnabled}
                  onChange={(e) => setCronSettings({ ...cronSettings, cronEnabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="cronEnabled" className="text-sm font-medium text-gray-700">
                  Enable payment cleanup
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule
                  </label>
                  <input
                    type="text"
                    value={cronSettings.cronSchedule}
                    onChange={(e) => setCronSettings({ ...cronSettings, cronSchedule: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0 * * * *"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expire PENDING Payments After (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={cronSettings.cronCutoffHours}
                    onChange={(e) => setCronSettings({ ...cronSettings, cronCutoffHours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Jobs */}
          <div className="border-b pb-4">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Subscription Management</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="subscriptionCronEnabled"
                  checked={cronSettings.subscriptionCronEnabled}
                  onChange={(e) => setCronSettings({ ...cronSettings, subscriptionCronEnabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="subscriptionCronEnabled" className="text-sm font-medium text-gray-700">
                  Enable subscription management
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Check Schedule
                  </label>
                  <input
                    type="text"
                    value={cronSettings.subscriptionCronScheduleExpire}
                    onChange={(e) => setCronSettings({ ...cronSettings, subscriptionCronScheduleExpire: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0 9 * * *"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Schedule
                  </label>
                  <input
                    type="text"
                    value={cronSettings.subscriptionCronScheduleReminder}
                    onChange={(e) => setCronSettings({ ...cronSettings, subscriptionCronScheduleReminder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0 9 * * *"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Jobs */}
          <div className="border-b pb-4">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Maintenance</h3>
            <h3 className="text-sm font-semibold text-gray-900 mb-3"> Purpose: Remove old payment records
 ,Schedule: Hourly (configurable)
 Logic: FAILED/CANCELLED payments older than 6 months → DELETE</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="maintenanceCronEnabled"
                  checked={cronSettings.maintenanceCronEnabled}
                  onChange={(e) => setCronSettings({ ...cronSettings, maintenanceCronEnabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="maintenanceCronEnabled" className="text-sm font-medium text-gray-700">
                  
                  Enable maintenance cleanup
                  
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cleanup Schedule
                </label>
                <input
                  type="text"
                  value={cronSettings.maintenanceCronSchedule}
                  onChange={(e) => setCronSettings({ ...cronSettings, maintenanceCronSchedule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0 * * * *"
                />
              </div>
            </div>
          </div>

          {/* Reporting Jobs */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">Reporting</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="reportCronEnabled"
                  checked={cronSettings.reportCronEnabled}
                  onChange={(e) => setCronSettings({ ...cronSettings, reportCronEnabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="reportCronEnabled" className="text-sm font-medium text-gray-700">
                  Enable weekly statistics
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statistics Update Schedule
                </label>
                <input
                  type="text"
                  value={cronSettings.reportCronScheduleWeekly}
                  onChange={(e) => setCronSettings({ ...cronSettings, reportCronScheduleWeekly: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0 0 * * 0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Cron Expression Examples:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li><code>"0 * * * *"</code> - Every hour</li>
            <li><code>"0 9 * * *"</code> - Daily at 9:00 AM</li>
            <li><code>"0 0 * * 0"</code> - Weekly on Sunday at midnight</li>
            <li><code>"*/10 * * * *"</code> - Every 10 minutes</li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
          </div>
            <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-primary flex items-center space-x-2"
         >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save System Settings'}</span>
        </button>
        </div>
      {/* Email Settings with Test Feature */}
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

          {/* Test Email Section */}
          <div className="border-t pt-4">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Test Email Configuration</h3>
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Email Address
                </label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="test@example.com"
                />
              </div>
              <button
                onClick={sendTestEmail}
                disabled={testingEmail || !testEmailAddress}
                className="btn-secondary flex items-center space-x-2"
              >
                <Mail className="w-4 h-4" />
                <span>{testingEmail ? 'Sending...' : 'Send Test'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Your existing Traccar, Device, and System Settings sections */}
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

      {/* System Maintenance Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Maintenance  Settings</h2>
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