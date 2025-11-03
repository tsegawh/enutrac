import { useState, useEffect } from 'react';
import { BarChart3, MapPin, Calendar, Download, Smartphone, Users } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DeviceReportsModal from '../../components/AdminDeviceReports';
import { useAuth } from '../../contexts/AuthContext';
//import { Navigate } from 'react-router-dom';

interface Device {
  id: string;
  name: string;
  uniqueId: string;
  traccarId: number;
  lastUpdate: number | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  isActive: boolean;
  isOnline?: boolean;
  userId: string | null;
  userEmail?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

export default function AdminReports() {
   useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Redirect non-admins
  //if (!user || user.role !== 'admin') {
  //  return <Navigate to="/dashbaord/reports" />;
  //}

  useEffect(() => {
    fetchUsers();
    fetchDevices();
  }, [selectedUserId, filter]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/admin/users');
      setUsers([{ id: 'all', email: 'All Users', name: 'All Users' }, ...response.data.users]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/devices', {
        params: {
          status: filter !== 'ALL' ? filter : undefined,
          userId: selectedUserId !== 'all' ? selectedUserId : undefined,
        },
      });
      console.log('Fetched devices:', response.data.devices);
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  // Filter devices based on search query
  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = devices.filter(
      (device) =>
        device.name.toLowerCase().includes(lowerQuery) ||
        device.uniqueId.toLowerCase().includes(lowerQuery) ||
        (device.userEmail && device.userEmail.toLowerCase().includes(lowerQuery))
    );
    setFilteredDevices(filtered);
  }, [searchQuery, devices]);

  const reportTypes = [
    {
      id: 'summary',
      title: 'Summary Reports',
      description: 'Distance, speed, and time analytics',
      icon: BarChart3,
      color: 'bg-primary-100 text-primary-600',
    },
    {
      id: 'route',
      title: 'Route Reports',
      description: 'Visual route tracking on map',
      icon: MapPin,
      color: 'bg-success-100 text-success-600',
    },
    {
      id: 'positions',
      title: 'Position History',
      description: 'Detailed GPS coordinate data',
      icon: Calendar,
      color: 'bg-warning-100 text-warning-600',
    },
  ];

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Device Reports</h1>
        <p className="text-gray-600">Generate comprehensive reports for all GPS devices across users</p>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="flex flex-wrap items-center gap-4">
          {/* User Filter */}
          <div className="flex items-center space-x-4">
            <Users className="w-5 h-5 text-gray-600" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-4">
            <Smartphone className="w-5 h-5 text-gray-600" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="flex items-center space-x-4 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by device name, ID, or user email"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTypes.map((type) => {
          const Icon = type.icon;
          return (
            <div key={type.id} className="card">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{type.title}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Device Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Device for Reports</h2>
        
        {filteredDevices.length === 0 ? (
          <div className="text-center py-12">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No devices available</h3>
            <p className="text-gray-600">No devices found for the selected filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDevices.map((device) => (
              <div
                key={device.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  console.log(`Opening reports for device ID: ${device.id}`);
                  setSelectedDevice({
                   id: device.id,
    name: device.name,
    uniqueId: device.uniqueId,
    userEmail: device.userEmail ,
    traccarId: device.traccarId,
    lastUpdate: device.lastUpdate,
    latitude: device.latitude,
    longitude: device.longitude,
    speed: device.speed,
    course: device.course,
    isActive: device.isActive,
    userId: device.userId || null, 
                  });
                }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      device.isOnline ? 'bg-success-100' : 'bg-gray-100'
                    }`}
                  >
                    <Smartphone
                      className={`w-5 h-5 ${device.isOnline ? 'text-success-600' : 'text-gray-400'}`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{device.name}</h3>
                    <p className="text-sm text-gray-600">{device.uniqueId}</p>
                    <p className="text-sm text-gray-500">User: {device.userEmail || 'Unassigned'}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          device.isOnline ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {device.isOnline ? 'Online' : 'Offline'}
                      </span>
                      {device.lastUpdate && (
                        <span className="text-xs text-gray-500">
                          {new Date(device.lastUpdate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button className="btn-primary w-full text-sm">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Reports
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(filteredDevices, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `all_devices_${selectedUserId === 'all' ? 'all_users' : selectedUserId}_${
                filter === 'ALL' ? 'all_statuses' : filter
              }_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('All device data exported');
            }}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Download className="w-5 h-5 text-primary-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Export All Device Data</div>
              <div className="text-sm text-gray-600">Download data for filtered devices</div>
            </div>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <Calendar className="w-5 h-5 text-primary-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Schedule Reports</div>
              <div className="text-sm text-gray-600">Set up automated reporting</div>
            </div>
          </button>
        </div>
      </div>

      {/* Device Reports Modal */}
      {selectedDevice && (
        <DeviceReportsModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </div>
  );
}