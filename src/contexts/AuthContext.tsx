import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDevices, getAppStatus } from '@/lib/api';

interface Device {
  id: string;
  name?: string;
  status?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  devices: Device[];
  selectedDevice: string;
  isServerOnline: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setSelectedDevice: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  checkServerStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDeviceState] = useState('');
  const [isServerOnline, setIsServerOnline] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem('gowa_authenticated');
    const device = localStorage.getItem('gowa_device_id');
    if (auth === 'true') {
      setIsAuthenticated(true);
      if (device) setSelectedDeviceState(device);
    }
  }, []);

  const checkServerStatus = async (): Promise<boolean> => {
    try {
      await getAppStatus();
      setIsServerOnline(true);
      return true;
    } catch (error: any) {
      // Check if it's a CORS error or network error
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setIsServerOnline(false);
        return false;
      }
      // If we get a response (even 401), server is online
      if (error.response) {
        setIsServerOnline(true);
        return true;
      }
      setIsServerOnline(false);
      return false;
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    localStorage.setItem('gowa_username', username);
    localStorage.setItem('gowa_password', password);
    
    try {
      const response = await getDevices();
      if (response.data) {
        localStorage.setItem('gowa_authenticated', 'true');
        setIsAuthenticated(true);
        setIsServerOnline(true);
        
        // Handle different response formats from the API
        const deviceList = response.data.results || response.data.devices || response.data || [];
        setDevices(Array.isArray(deviceList) ? deviceList : []);
        return { success: true };
      }
      return { success: false, error: 'No data received from server' };
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle CORS/Network error - common when accessing from browser
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setIsServerOnline(false);
        return { 
          success: false, 
          error: 'Cannot connect to GOWA server. This may be due to CORS restrictions. Please ensure the API server allows cross-origin requests from this domain, or run this dashboard on the same domain as the API.'
        };
      }
      
      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        return { success: false, error: 'Invalid username or password' };
      }
      
      // Handle other HTTP errors
      if (error.response) {
        return { success: false, error: error.response.data?.message || `Server error: ${error.response.status}` };
      }
      
      return { success: false, error: 'Connection failed. Please check the server URL.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('gowa_authenticated');
    localStorage.removeItem('gowa_device_id');
    setIsAuthenticated(false);
    setSelectedDeviceState('');
    setDevices([]);
  };

  const setSelectedDevice = (deviceId: string) => {
    localStorage.setItem('gowa_device_id', deviceId);
    setSelectedDeviceState(deviceId);
  };

  const refreshDevices = async () => {
    try {
      const response = await getDevices();
      const deviceList = response.data.results || response.data.devices || response.data || [];
      setDevices(Array.isArray(deviceList) ? deviceList : []);
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      devices, 
      selectedDevice,
      isServerOnline,
      login, 
      logout, 
      setSelectedDevice,
      refreshDevices,
      checkServerStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
