import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNotifications } from '../contexts/NotificationContext';
import { LogOut, Wifi, WifiOff, Menu, Bell, X, Check, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAllNotifications 
  } = useNotifications();
  
  const [isNotificationOpen, setNotificationOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'device': return '🔧';
      case 'report': return '📊';
      case 'system': return '⚠️';
      case 'subscription': return '💰';
      default: return '🔔';
    }
  };

  const handleNotificationClick = (notification: any): void => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setNotificationOpen(false);
    
    // You can add navigation logic here based on notification type
    switch (notification.type) {
      case 'device':
        window.location.href = '/dashboard/devices';
        break;
      case 'report':
        window.location.href = '/dashboard/reports';
        break;
      case 'subscription':
        window.location.href = '/dashboard/account';
        break;
      default:
        break;
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Menu button and welcome message */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 mr-2"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Welcome message */}
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Welcome back, {user?.name}
            </h2>
            
            {/* Connection status - hidden on mobile */}
            <div className="hidden sm:flex items-center space-x-2">
              {connected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-600 font-medium">Disconnected</span>
                </>
              )}
            </div>
          </div>

          {/* Right side - User info and actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Connection status - mobile only */}
            <div className="sm:hidden">
              {connected ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
            </div>

            {/* User subscription info - hidden on mobile */}
            {user?.subscription && (
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{user.subscription.plan.name}</span>
                <span className="mx-2">•</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.subscription.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.subscription.status}
                </span>
              </div>
            )}

            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <div className="flex space-x-2">
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          title="Mark all as read"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button 
                          onClick={clearAllNotifications}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center space-x-1"
                          title="Clear all notifications"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear all</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex space-x-2 flex-1">
                              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm">
                                  {notification.title}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatTime(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="flex items-center space-x-2 p-2 sm:px-3 sm:py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}