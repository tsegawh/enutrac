// contexts/NotificationContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { toast } from 'react-hot-toast';

// Types
export interface Notification {
  id: string;
  type: 'device' | 'report' | 'system' | 'subscription';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

interface NotificationProviderProps {
  children: ReactNode;
}

// Socket event types
interface DeviceStatusUpdate {
  deviceId: string;
  status: string;
}

interface ReportGenerated {
  reportType: string;
}

interface SystemAlert {
  message: string;
}

interface SubscriptionReminder {
  daysRemaining: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { socket, connected } = useSocket();

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('userNotifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        // Convert timestamp strings back to Date objects
        const notificationsWithDates = parsed.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp),
        }));
        setNotifications(notificationsWithDates);
        setUnreadCount(notificationsWithDates.filter((n: Notification) => !n.read).length);
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
      }
    }
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem('userNotifications', JSON.stringify(notifications));
  }, [notifications]);

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (socket && connected) {
      // Device status updates
      socket.on('device_status_update', (data: DeviceStatusUpdate) => {
        addNotification({
          type: 'device',
          title: 'Device Status Update',
          message: `Device ${data.deviceId} is now ${data.status}`,
          timestamp: new Date(),
          read: false,
          data: data
        });
      });

      // New reports generated
      socket.on('report_generated', (data: ReportGenerated) => {
        addNotification({
          type: 'report',
          title: 'New Report Available',
          message: `Your ${data.reportType} report is ready`,
          timestamp: new Date(),
          read: false,
          data: data
        });
      });

      // System alerts
      socket.on('system_alert', (data: SystemAlert) => {
        addNotification({
          type: 'system',
          title: 'System Alert',
          message: data.message,
          timestamp: new Date(),
          read: false,
          data: data
        });
        
        // Show toast for important alerts
        toast.error(data.message);
      });

      // Subscription reminders
      socket.on('subscription_reminder', (data: SubscriptionReminder) => {
        addNotification({
          type: 'subscription',
          title: 'Subscription Reminder',
          message: `Your subscription expires in ${data.daysRemaining} days`,
          timestamp: new Date(),
          read: false,
          data: data
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('device_status_update');
        socket.off('report_generated');
        socket.off('system_alert');
        socket.off('subscription_reminder');
      }
    };
  }, [socket, connected]);

  const addNotification = (notification: Omit<Notification, 'id'>): void => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);
    
    // Show toast for new notifications
    toast(notification.message, {
      icon: getNotificationIcon(notification.type),
    });
  };

  const markAsRead = (notificationId: string): void => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = (): void => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = (notificationId: string): void => {
    const notification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const clearAllNotifications = (): void => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'device': return '🔧';
      case 'report': return '📊';
      case 'system': return '⚠️';
      case 'subscription': return '💰';
      default: return '🔔';
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};