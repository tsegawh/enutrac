import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      console.log('🔌 Connecting to Socket.IO server...');

      const newSocket = io('https://263ab849-b245-4311-a786-7563d1dcfb6a-00-260159f56g1ck.janeway.replit.dev', {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from Socket.IO server');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
        setConnected(false);
      });

      // Listen for real-time updates
      newSocket.on('device:position', (data) => {
        console.log('📍 Device position update:', data);
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent('devicePositionUpdate', { detail: data }));
      });

      newSocket.on('device:status', (data) => {
        console.log('📱 Device status update:', data);
        window.dispatchEvent(new CustomEvent('deviceStatusUpdate', { detail: data }));
      });

      newSocket.on('subscription:update', (data) => {
        console.log('💳 Subscription update:', data);
        toast.success('Subscription updated successfully!');
        window.dispatchEvent(new CustomEvent('subscriptionUpdate', { detail: data }));
      });

      newSocket.on('payment:update', (data) => {
        console.log('💰 Payment update:', data);
        if (data.status === 'COMPLETED') {
          toast.success('Payment completed successfully!');
        } else if (data.status === 'FAILED') {
          toast.error('Payment failed. Please try again.');
        }
        window.dispatchEvent(new CustomEvent('paymentUpdate', { detail: data }));
      });

      newSocket.on('error', (error) => {
        console.error('❌ Socket.IO error:', error);
        toast.error(error.message || 'Connection error');
      });

      setSocket(newSocket);

      return () => {
        console.log('🔌 Disconnecting from Socket.IO server...');
        newSocket.close();
        setSocket(null);
        setConnected(false);
      };
    }
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

  const value = {
    socket,
    connected,
    subscribeToDevices,
    unsubscribeFromDevices,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}