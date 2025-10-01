import React, { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

interface AddDeviceModalProps {
  onClose: () => void;
  onDeviceAdded: () => void;
}

export default function AddDeviceModal({ onClose, onDeviceAdded }: AddDeviceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    uniqueId: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Device name is required';
    }

    if (!formData.uniqueId.trim()) {
      newErrors.uniqueId = 'Unique ID is required';
    } else if (formData.uniqueId.length < 3) {
      newErrors.uniqueId = 'Unique ID must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await axios.post('/device', formData);
      toast.success('Device added successfully!');
      onDeviceAdded();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to add device';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add New Device</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="label">
              Device Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={`input ${errors.name ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
              placeholder="e.g., My Car GPS"
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-error-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="uniqueId" className="label">
              Unique ID
            </label>
            <input
              id="uniqueId"
              name="uniqueId"
              type="text"
              value={formData.uniqueId}
              onChange={handleChange}
              className={`input ${errors.uniqueId ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''}`}
              placeholder="e.g., 123456789012345"
              required
            />
            {errors.uniqueId && (
              <p className="mt-1 text-sm text-error-600">{errors.uniqueId}</p>
            )}
            <p className="mt-1 text-sm text-gray-600">
              This should match the IMEI or unique identifier of your GPS device
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-primary-900 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-primary-800 space-y-1 list-decimal list-inside">
              <li>Configure your GPS device to send data to the Traccar server</li>
              <li>Use the unique ID exactly as configured in your device</li>
              <li>Ensure your device is powered on and has GPS signal</li>
              <li>Data will appear once the device starts transmitting</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                'Add Device'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}