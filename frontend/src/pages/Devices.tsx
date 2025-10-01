import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Clock, Wifi, WifiOff, Trash2, Edit, BarChart3 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DeviceMap from '../components/DeviceMap';
import AddDeviceModal from '../components/AddDeviceModal';
import DeviceReportsModal from '../components/DeviceReportsModal';
import { useSocket } from '../contexts/SocketContext';

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
  position?: any;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedDeviceForReports, setSelectedDeviceForReports] = useState<Device | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const { subscribeToDevices, unsubscribeFromDevices } = useSocket();

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    // Subscribe to real-time updates for all devices
    if (devices.length > 0) {
      const deviceIds = devices.map(d => d.id);
      subscribeToDevices(deviceIds);

      return () => {
        unsubscribeFromDevices(deviceIds);
      };
    }
  }, [devices, subscribeToDevices, unsubscribeFromDevices]);

  useEffect(() => {
    // Listen for real-time position updates
    const handlePositionUpdate = (event: CustomEvent) => {
      const { deviceId, position } = event.detail;
      
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? {
              ...device,
              latitude: position.latitude,
              longitude: position.longitude,
              speed: position.speed,
              course: position.course,
              lastUpdate: position.timestamp,
            }
          : device
      ));
    };

    const handleStatusUpdate = (event: CustomEvent) => {
      const { deviceId, status } = event.detail;
      
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, isOnline: status === 'online' }
          : device
      ));
    };

    window.addEventListener('devicePositionUpdate', handlePositionUpdate as EventListener);
    window.addEventListener('deviceStatusUpdate', handleStatusUpdate as EventListener);

    return () => {
      window.removeEventListener('devicePositionUpdate', handlePositionUpdate as EventListener);
      window.removeEventListener('deviceStatusUpdate', handleStatusUpdate as EventListener);
    };
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

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) {
      return;
    }

    try {
      await axios.delete(`/device/${deviceId}`);
      toast.success('Device deleted successfully');
      fetchDevices();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete device';
      toast.error(message);
    }
  };

  const handleDeviceAdded = () => {
    setShowAddModal(false);
    fetchDevices();
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
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-600">Manage and track your GPS devices</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Map
            </button>
          </div>

          {/* Add Device Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'map' ? (
        <div className="card p-0 overflow-hidden">
          <DeviceMap devices={devices} selectedDevice={selectedDevice} />
        </div>
      ) : (
        <>
          {/* Devices List */}
          {devices.length === 0 ? (
            <div className="card text-center py-12">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No devices yet</h3>
              <p className="text-gray-600 mb-6">
                Add your first GPS device to start tracking
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Device
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <div key={device.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        device.isOnline ? 'bg-success-100' : 'bg-gray-100'
                      }`}>
                        <MapPin className={`w-5 h-5 ${
                          device.isOnline ? 'text-success-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{device.name}</h3>
                        <p className="text-sm text-gray-600">{device.uniqueId}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Online Status */}
                      <div className="flex items-center space-x-1">
                        {device.isOnline ? (
                          <>
                            <div className="w-2 h-2 bg-success-500 rounded-full pulse-green"></div>
                            <Wifi className="w-4 h-4 text-success-600" />
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <WifiOff className="w-4 h-4 text-gray-400" />
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => handleDeleteDevice(device.id)}
                        className="p-1 text-gray-400 hover:text-error-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Device Info */}
                  <div className="space-y-2">
                    {device.latitude && device.longitude ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">
                          {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Location:</span>
                        <span className="text-gray-400">No data</span>
                      </div>
                    )}

                    {device.speed !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Speed:</span>
                        <span className="font-medium">{Math.round(device.speed)} km/h</span>
                      </div>
                    )}

                    {device.lastUpdate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last Update:</span>
                        <span className="font-medium">
                          {format(new Date(device.lastUpdate), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* View on Map Button */}
                  {device.latitude && device.longitude && (
                    <button
                      onClick={() => {
                        setSelectedDevice(device);
                        setViewMode('map');
                      }}
                      className="btn-secondary w-full mt-4"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      View on Map
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onDeviceAdded={handleDeviceAdded}
        />
      )}
    </div>
  );
}