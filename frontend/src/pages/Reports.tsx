import React, { useState, useEffect } from 'react';
import { BarChart3, MapPin, Calendar, Download, Smartphone } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DeviceReportsModal from '../components/DeviceReportsModal';

interface Device {
  id: string;
  name: string;
  uniqueId: string;
  traccarId: number;
  lastUpdate: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  isActive: boolean;
  isOnline?: boolean;
}

export default function Reports() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await axios.get('/device');
      setDevices(response.data.devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      id: 'summary',
      title: 'Summary Reports',
      description: 'Distance, speed, and time analytics',
      icon: BarChart3,
      color: 'bg-primary-100 text-primary-600'
    },
    {
      id: 'route',
      title: 'Route Reports',
      description: 'Visual route tracking on map',
      icon: MapPin,
      color: 'bg-success-100 text-success-600'
    },
    {
      id: 'positions',
      title: 'Position History',
      description: 'Detailed GPS coordinate data',
      icon: Calendar,
      color: 'bg-warning-100 text-warning-600'
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Device Reports</h1>
        <p className="text-gray-600">Generate comprehensive reports for your GPS devices</p>
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
        
        {devices.length === 0 ? (
          <div className="text-center py-12">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No devices available</h3>
            <p className="text-gray-600">Add devices to generate reports</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedDevice(device)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    device.isOnline ? 'bg-success-100' : 'bg-gray-100'
                  }`}>
                    <Smartphone className={`w-5 h-5 ${
                      device.isOnline ? 'text-success-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{device.name}</h3>
                    <p className="text-sm text-gray-600">{device.uniqueId}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        device.isOnline 
                          ? 'bg-success-100 text-success-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
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
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <Download className="w-5 h-5 text-primary-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Export All Data</div>
              <div className="text-sm text-gray-600">Download complete device data</div>
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