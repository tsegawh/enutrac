import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-gradient-to-br from-warning-50 to-warning-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          {/* Cancel Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-warning-100 rounded-full mb-6">
            <XCircle className="w-8 h-8 text-warning-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
          <p className="text-gray-600 mb-6">
            Your payment was cancelled and no charges were made to your account.
          </p>

          {/* Order Details */}
          {orderId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Order Details</h3>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium">{orderId}</span>
                </div>
              </div>
            </div>
          )}

          {/* Information */}
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6">
            <p className="text-warning-800 text-sm">
              💡 No worries! You can try again anytime. Your current subscription remains unchanged.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="btn-primary w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Link>
            
            <Link
              to="/dashboard"
              className="btn-secondary w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Help */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Need help?</p>
            <p className="text-xs text-gray-500">
              If you're experiencing issues with payment, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}