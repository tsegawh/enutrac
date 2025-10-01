import dotenv from 'dotenv';
dotenv.config(); 
import axios, { AxiosInstance } from 'axios';

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status?: string;
  lastUpdate?: string;
  positionId?: number;
}

export interface TraccarPosition {
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

/**
 * Traccar API Service
 * Handles communication with Traccar GPS tracking server
 */
export class TraccarService {
  private client: AxiosInstance;
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor() {
    this.baseUrl = process.env.TRACCAR_URL
    this.username = process.env.TRACCAR_USER || 'admin';
    this.password = process.env.TRACCAR_PASS || 'admin';

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api`,
      auth: {
        username: this.username,
        password: this.password,
      },
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`🛰️ Traccar service initialized: ${this.baseUrl}`);
  }

  /**
   * Test connection to Traccar server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/server');
      return response.status === 200;
    } catch (error) {
      console.error('❌ Traccar connection failed:', error);
      return false;
    }
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<TraccarDevice[]> {
    try {
      const response = await this.client.get('/devices');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching devices:', error);
      throw new Error('Failed to fetch devices from Traccar');
    }
  }

  /**
   * Get device by ID
   */
  async getDeviceById(deviceId: number): Promise<TraccarDevice> {
    try {
      const response = await this.client.get(`/devices/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching device ${deviceId}:`, error);
      throw new Error('Failed to fetch device from Traccar');
    }
  }

  /**
   * Create new device
   */
  async createDevice(deviceData: { name: string; uniqueId: string }): Promise<TraccarDevice> {
    try {
      const response = await this.client.post('/devices', deviceData);
      console.log('✅ Device created in Traccar:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating device:', error);
      throw new Error('Failed to create device in Traccar');
    }
  }

  /**
   * Update device
   */
  async updateDevice(deviceId: number, deviceData: Partial<TraccarDevice>): Promise<TraccarDevice> {
    try {
      const response = await this.client.put(`/devices/${deviceId}`, deviceData);
      console.log('✅ Device updated in Traccar:', deviceId);
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating device ${deviceId}:`, error);
      throw new Error('Failed to update device in Traccar');
    }
  }

  /**
   * Delete device
   */
  async deleteDevice(deviceId: number): Promise<void> {
    try {
      await this.client.delete(`/devices/${deviceId}`);
      console.log('✅ Device deleted from Traccar:', deviceId);
    } catch (error) {
      console.error(`❌ Error deleting device ${deviceId}:`, error);
      throw new Error('Failed to delete device from Traccar');
    }
  }

  /**
   * Get latest position for device
   */
  async getLatestPosition(deviceId: number): Promise<TraccarPosition | null> {
    try {
      const response = await this.client.get('/positions', {
        params: {
          deviceId,
          from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          to: new Date().toISOString(),
        },
      });

      const positions = response.data;
      return positions.length > 0 ? positions[positions.length - 1] : null;
    } catch (error) {
      console.error(`❌ Error fetching latest position for device ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Get positions for device within date range
   */
  async getPositions(
    deviceId: number,
    from?: string,
    to?: string
  ): Promise<TraccarPosition[]> {
    try {
      const params: any = { deviceId };
      
      if (from) params.from = from;
      if (to) params.to = to;
      
      // Default to last 24 hours if no dates provided
      if (!from && !to) {
        params.from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        params.to = new Date().toISOString();
      }

      const response = await this.client.get('/positions', { params });
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching positions for device ${deviceId}:`, error);
      throw new Error('Failed to fetch positions from Traccar');
    }
  }

  /**
   * Get server info
   */
  async getServerInfo(): Promise<any> {
    try {
      const response = await this.client.get('/server');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching server info:', error);
      throw new Error('Failed to fetch server info from Traccar');
    }
  }

  /**
   * Get device statistics
   */
  async getDeviceStats(): Promise<{ total: number; online: number; offline: number }> {
    try {
      const devices = await this.getDevices();
      const total = devices.length;
      const online = devices.filter(d => d.status === 'online').length;
      const offline = total - online;

      return { total, online, offline };
    } catch (error) {
      console.error('❌ Error fetching device stats:', error);
      return { total: 0, online: 0, offline: 0 };
    }
  }
}