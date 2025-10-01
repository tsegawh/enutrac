import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Smartphone, MapPin, Battery, Signal, Map } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import DeviceMap from '../../components/DeviceMap'; // import the DeviceMap component

interface Device {
  id: string;
  name: string;
  imei: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  lastUpdate?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdminDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, [filter]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/devices', {
        params: { status: filter !== 'ALL' ? filter : undefined }
      });
      setDevices(response.data.devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceStatus = (device: Device) => {
    if (!device.isActive) return { status: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    if (!device.lastUpdate) return { status: 'No Data', color: 'bg-yellow-100 text-yellow-800' };

    const lastUpdate = new Date(device.lastUpdate);
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    if (minutesSinceUpdate < 10) return { status: 'Online', color: 'bg-green-100 text-green-800' };
    if (minutesSinceUpdate < 60) return { status: 'Recent', color: 'bg-blue-100 text-blue-800' };
    return { status: 'Offline', color: 'bg-red-100 text-red-800' };
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
          <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
          <p className="text-gray-600">Monitor and manage all registered devices</p>
        </div>
        {/* View All Devices on Map Button */}
        <button
          onClick={() => setShowMap(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Map className="w-4 h-4" />
          <span>View All Devices on Map</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Signal className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Online</p>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => getDeviceStatus(d).status === 'Online').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Battery className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Offline</p>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => getDeviceStatus(d).status === 'Offline').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-900">
                {devices.filter(d => !d.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => {
                const deviceStatus = getDeviceStatus(device);
                return (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{device.name}</div>
                          <div className="text-sm text-gray-500">{device.imei}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{device.user.name}</div>
                        <div className="text-sm text-gray-500">{device.user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${deviceStatus.color}`}>
                        {deviceStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {device.latitude && device.longitude ? (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No location</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {device.lastUpdate ? (
                        new Date(device.lastUpdate).toLocaleString()
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map Modal */}
      <Dialog open={showMap} onClose={() => setShowMap(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-6xl h-[80vh] bg-white rounded-lg shadow-lg">
            <Dialog.Title className="p-4 text-lg font-semibold border-b">All Devices Map</Dialog.Title>
            <div className="h-full p-2">
              <DeviceMap devices={devices} showRoute={false} />
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
