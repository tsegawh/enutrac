import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  subscribeToDevices: (deviceIds: string[]) => void;
  unsubscribeFromDevices: (deviceIds: string[]) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !user ) return; // Don't connect without auth

    console.log('🔌 Connecting to Socket.IO server...', BACKEND_URL);

    const newSocket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket.IO connection error:', err);
      setConnected(false);
    });

    // Device updates
    newSocket.on('device:position', (data) => {
      window.dispatchEvent(new CustomEvent('devicePositionUpdate', { detail: data }));
    });

    newSocket.on('device:status', (data) => {
      window.dispatchEvent(new CustomEvent('deviceStatusUpdate', { detail: data }));
    });

    // Subscription updates
    newSocket.on('subscription:update', (data) => {
      toast.success('Subscription updated successfully!');
      window.dispatchEvent(new CustomEvent('subscriptionUpdate', { detail: data }));
    });

    // Payment updates
    newSocket.on('payment:update', (data) => {
      if (data.status === 'COMPLETED') toast.success('Payment completed successfully!');
      else if (data.status === 'FAILED') toast.error('Payment failed. Please try again.');
      window.dispatchEvent(new CustomEvent('paymentUpdate', { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Disconnecting from Socket.IO server...');
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token, user]);

  const subscribeToDevices = (deviceIds: string[]) => {
    if (socket && connected) {
      console.log('📡 Subscribing to devices:', deviceIds);
      socket.emit('subscribe:devices', deviceIds);
    }
  };

  const unsubscribeFromDevices = (deviceIds: string[]) => {
    if (socket && connected) {
      console.log('📡 Unsubscribing from devices:', deviceIds);
      socket.emit('unsubscribe:devices', deviceIds);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, subscribeToDevices, unsubscribeFromDevices }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}
