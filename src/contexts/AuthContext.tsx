import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDevices } from '@/lib/api';

interface Device {
  id: string;
  name?: string;
  status?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  devices: Device[];
  selectedDevice: string;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setSelectedDevice: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDeviceState] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('gowa_authenticated');
    const device = localStorage.getItem('gowa_device_id');
    if (auth === 'true') {
      setIsAuthenticated(true);
      if (device) setSelectedDeviceState(device);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    localStorage.setItem('gowa_username', username);
    localStorage.setItem('gowa_password', password);
    
    try {
      const response = await getDevices();
      if (response.data) {
        localStorage.setItem('gowa_authenticated', 'true');
        setIsAuthenticated(true);
        setDevices(response.data.devices || response.data || []);
        return true;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
    return false;
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
      setDevices(response.data.devices || response.data || []);
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      devices, 
      selectedDevice, 
      login, 
      logout, 
      setSelectedDevice,
      refreshDevices 
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
