import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { LogOut, Wifi, WifiOff } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back, {user?.name}
          </h2>
          
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            {connected ? (
              <>
                <Wifi className="w-4 h-4 text-success-600" />
                <span className="text-xs text-success-600 font-medium">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-error-600" />
                <span className="text-xs text-error-600 font-medium">Disconnected</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* User subscription info */}
          {user?.subscription && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user.subscription.plan.name}</span>
              <span className="mx-2">•</span>
              <span className={`badge ${
                user.subscription.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'
              }`}>
                {user.subscription.status}
              </span>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}