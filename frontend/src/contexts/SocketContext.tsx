import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  subscribeToDevices: (deviceIds: string[]) => void;
  unsubscribeFromDevices: (deviceIds: string[]) => void;
  subscribeToAdmin: () => void; 
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      // ✅ ADD: Clean up socket if user logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    console.log('🔌 Connecting to Socket.IO server...', BACKEND_URL);

    const newSocket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      // ❌ REMOVE: Don't manually send cookies - withCredentials handles this
      // extraHeaders: {
      //   Cookie: document.cookie,
      // }
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setConnected(true);
      
      // ✅ ADD: Auto-subscribe to user's devices if needed
      // You can add logic here to automatically subscribe to user's devices
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket.IO connection error:', err.message);
      setConnected(false);
      
      // ✅ ADD: Show user-friendly error for auth failures
      if (err.message.includes('auth') || err.message.includes('token')) {
        toast.error('Authentication failed. Please login again.');
      }
    });

    // ✅ ADD: Handle authentication errors from server
    newSocket.on('error', (error) => {
      console.error('❌ Socket.IO error:', error);
      if (error.message?.includes('auth') || error.message?.includes('token')) {
        toast.error('Session expired. Please login again.');
      }
    });

    // ✅ ADD: Handle subscription confirmations
    newSocket.on('devices:subscribed', (deviceIds) => {
      console.log('✅ Subscribed to devices:', deviceIds);
    });

    newSocket.on('devices:unsubscribed', (deviceIds) => {
      console.log('✅ Unsubscribed from devices:', deviceIds);
    });

    // Device updates
    newSocket.on('device:position', (data) => {
      console.log('📍 Device position update:', data);
      window.dispatchEvent(new CustomEvent('devicePositionUpdate', { detail: data }));
    });

    newSocket.on('device:status', (data) => {
      console.log('📊 Device status update:', data);
      window.dispatchEvent(new CustomEvent('deviceStatusUpdate', { detail: data }));
    });

    // Subscription updates
    newSocket.on('subscription:update', (data) => {
      console.log('🔄 Subscription update:', data);
      toast.success('Subscription updated successfully!');
      window.dispatchEvent(new CustomEvent('subscriptionUpdate', { detail: data }));
    });

    // Payment updates
    newSocket.on('payment:update', (data) => {
      console.log('💳 Payment update:', data);
      if (data.status === 'COMPLETED') {
        toast.success('Payment completed successfully!');
      } else if (data.status === 'FAILED') {
        toast.error('Payment failed. Please try again.');
      } else if (data.status === 'PENDING') {
        toast.loading('Payment processing...');
      }
      window.dispatchEvent(new CustomEvent('paymentUpdate', { detail: data }));
    });

    // ✅ ADD: Admin events
    newSocket.on('admin:subscribed', () => {
      console.log('✅ Subscribed to admin dashboard');
    });

    newSocket.on('device:update', (data) => {
      console.log('🔄 Admin device update:', data);
      window.dispatchEvent(new CustomEvent('adminDeviceUpdate', { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Disconnecting from Socket.IO server...');
      newSocket.off('connect'); // ✅ ADD: Clean up all listeners
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('error');
      newSocket.off('devices:subscribed');
      newSocket.off('devices:unsubscribed');
      newSocket.off('device:position');
      newSocket.off('device:status');
      newSocket.off('subscription:update');
      newSocket.off('payment:update');
      newSocket.off('admin:subscribed');
      newSocket.off('device:update');
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]); // ✅ Only depend on user, not socket

  const subscribeToDevices = (deviceIds: string[]) => {
    if (socket && connected) {
      console.log('📡 Subscribing to devices:', deviceIds);
      socket.emit('subscribe:devices', deviceIds);
    } else {
      console.warn('⚠️ Cannot subscribe - socket not connected');
    }
  };

  const unsubscribeFromDevices = (deviceIds: string[]) => {
    if (socket && connected) {
      console.log('📡 Unsubscribing from devices:', deviceIds);
      socket.emit('unsubscribe:devices', deviceIds);
    } else {
      console.warn('⚠️ Cannot unsubscribe - socket not connected');
    }
  };

  // ✅ ADD: Admin subscription function
  const subscribeToAdmin = () => {
    if (socket && connected) {
      console.log('📡 Subscribing to admin dashboard');
      socket.emit('subscribe:admin');
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      connected, 
      subscribeToDevices, 
      unsubscribeFromDevices,
      subscribeToAdmin,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}