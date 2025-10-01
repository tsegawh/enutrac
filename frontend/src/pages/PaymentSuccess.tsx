import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {

  

    // Refresh user data to get updated subscription
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 to-success-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-success-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your subscription has been upgraded successfully.
          </p>

          {/* Payment Details */}
          {(orderId || amount) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Payment Details</h3>
              <div className="space-y-1 text-sm">
                {orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">{orderId}</span>
                  </div>
                )}
                {amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">${amount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6">
            <p className="text-success-800 text-sm">
              🎉 Your subscription is now active! You can start adding more devices and enjoy enhanced features.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="btn-primary w-full"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            
            <Link
              to="/devices"
              className="btn-secondary w-full"
            >
              Manage Devices
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}