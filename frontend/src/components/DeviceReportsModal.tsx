import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, BarChart3, Download, Clock, Gauge, Route } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DeviceMap from './DeviceMap';
import LoadingSpinner from './LoadingSpinner';

interface Device {
  id: string;
  name: string;
  uniqueId: string;
userEmail?: string;
}

interface ReportSummary {
  totalDistance: number;
  maxSpeed: number;
  averageSpeed: number;
  totalTime: number;
  movingTime: number;
  stoppedTime: number;
  positionCount: number;
}

interface Position {
  id: number;
  deviceId: number;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  attributes: Record<string, any>;
}

interface DeviceReportsModalProps {
  device: Device;
  onClose: () => void;
}

export default function DeviceReportsModal({ device, onClose }: DeviceReportsModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'route' | 'positions'>('summary');
  const [dateRange, setDateRange] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    summary: ReportSummary | null;
    positions: Position[];
  }>({
    summary: null,
    positions: []
  });

  useEffect(() => {
    fetchReports();
  }, [dateRange, customFrom, customTo]);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          from: today.toISOString(),
          to: now.toISOString()
        };
      case '7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return {
          from: sevenDaysAgo.toISOString(),
          to: now.toISOString()
        };
      case '30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return {
          from: thirtyDaysAgo.toISOString(),
          to: now.toISOString()
        };
      case 'custom':
        return {
          from: customFrom ? new Date(customFrom).toISOString() : today.toISOString(),
          to: customTo ? new Date(customTo).toISOString() : now.toISOString()
        };
      default:
        return {
          from: today.toISOString(),
          to: now.toISOString()
        };
    }
  };

  const fetchReports = async () => {
    if (!device.id) return;

    setLoading(true);
    try {
      const { from, to } = getDateRange();
      
      const [reportsResponse, positionsResponse] = await Promise.all([
        axios.get(`/device/${device.id}/reports`, {
          params: { from, to }
        }),
        axios.get(`/device/${device.id}/positions`, {
          params: { from, to, limit: 1000 }
        })
      ]);

      setReportData({
        summary: reportsResponse.data.summary,
        positions: positionsResponse.data.positions || []
      });
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load device reports');
    } finally {
      setLoading(false);
    }
  };

  const exportData = (type: 'summary' | 'positions') => {
    const data = type === 'summary' ? reportData.summary : reportData.positions;
    const filename = `${device.name}_${type}_${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`${type} data exported successfully`);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const routeData = reportData.positions.map(pos => ({
    latitude: pos.latitude,
    longitude: pos.longitude,
    speed: pos.speed,
    timestamp: pos.fixTime
  }));

  console.log('Route data:', routeData); // Debug log
  console.log('Report data positions:', reportData.positions); // Debug log
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Device Reports</h2>
            <p className="text-gray-600">{device.name} ({device.uniqueId})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            
            <div className="flex space-x-2">
              {[
                { value: 'today', label: 'Today' },
                { value: '7days', label: '7 Days' },
                { value: '30days', label: '30 Days' },
                { value: 'custom', label: 'Custom' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    dateRange === option.value
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'summary', label: 'Summary', icon: BarChart3 },
            { id: 'route', label: 'Route', icon: Route },
            { id: 'positions', label: 'Positions', icon: MapPin }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Report Summary</h3>
                    <button
                      onClick={() => exportData('summary')}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>
                  </div>

                  {reportData.summary ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="card">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Route className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Distance</p>
                            <p className="text-xl font-bold text-gray-900">
                              {reportData.summary.totalDistance.toFixed(2)} km
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="card">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                            <Gauge className="w-5 h-5 text-success-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Max Speed</p>
                            <p className="text-xl font-bold text-gray-900">
                              {Math.round(reportData.summary.maxSpeed)} km/h
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="card">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                            <Gauge className="w-5 h-5 text-warning-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Avg Speed</p>
                            <p className="text-xl font-bold text-gray-900">
                              {Math.round(reportData.summary.averageSpeed)} km/h
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="card">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Time</p>
                            <p className="text-xl font-bold text-gray-900">
                              {formatDuration(reportData.summary.totalTime)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="card">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Moving Time</p>
                            <p className="text-xl font-bold text-gray-900">
                              {formatDuration(reportData.summary.movingTime)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="card">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Positions</p>
                            <p className="text-xl font-bold text-gray-900">
                              {reportData.summary.positionCount}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No data available for the selected period</p>
                    </div>
                  )}
                </div>
              )}

              {/* Route Tab */}
              {activeTab === 'route' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Route Visualization</h3>
                    <div className="text-sm text-gray-600">
                      {routeData.length} position points
                    </div>
                  </div>

                  {routeData.length > 0 ? (
                    <div className="h-96 w-full">
                      <DeviceMap
                        devices={[{
                          id: device.id,
                          name: device.name,
                          uniqueId: device.uniqueId,
                          latitude: routeData[0]?.latitude || null,
                          longitude: routeData[0]?.longitude || null,
                          speed: null,
                          course: null,
                          lastUpdate: null,
                          isOnline: false
                        }]}
                        routeData={routeData}
                        showRoute={true}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No route data available</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Positions Tab */}
              {activeTab === 'positions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Position History</h3>
                    <button
                      onClick={() => exportData('positions')}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>
                  </div>

                  {reportData.positions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Latitude</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Longitude</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Speed</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Course</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Altitude</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {reportData.positions.slice(0, 100).map((position, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                {format(new Date(position.fixTime), 'MMM dd, HH:mm:ss')}
                              </td>
                              <td className="px-4 py-2 font-mono">
                                {position.latitude.toFixed(6)}
                              </td>
                              <td className="px-4 py-2 font-mono">
                                {position.longitude.toFixed(6)}
                              </td>
                              <td className="px-4 py-2">
                                {Math.round(position.speed)} km/h
                              </td>
                              <td className="px-4 py-2">
                                {Math.round(position.course)}°
                              </td>
                              <td className="px-4 py-2">
                                {Math.round(position.altitude)}m
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.positions.length > 100 && (
                        <div className="text-center py-4 text-gray-500">
                          Showing first 100 positions. Export for complete data.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No position data available</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}