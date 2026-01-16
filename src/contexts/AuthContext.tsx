import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getDevices, getAppStatus } from '@/lib/api';

interface Device {
  id: string;
  name?: string;
  status?: string;
  jid?: string;
}

type RawDevice = {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  state?: unknown;
  connection_state?: unknown;
  connectionStatus?: unknown;
  jid?: unknown;
};

interface AuthContextType {
  isAuthenticated: boolean;
  devices: Device[];
  selectedDevice: string;
  isServerOnline: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setSelectedDevice: (deviceId: string) => void;
  setDeviceName: (deviceId: string, name: string) => void;
  refreshDevices: () => Promise<void>;
  checkServerStatus: () => Promise<boolean>;
}

const SESSION_KEY = 'gowa_session';
const DEVICE_NAME_KEY = 'gowa_device_names';

type DeviceNameMap = Record<string, string>;

const getStoredDeviceNames = (): DeviceNameMap => {
  try {
    const raw = localStorage.getItem(DEVICE_NAME_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as DeviceNameMap;
    }
    return {};
  } catch {
    return {};
  }
};

const saveDeviceNames = (names: DeviceNameMap) => {
  try {
    localStorage.setItem(DEVICE_NAME_KEY, JSON.stringify(names));
  } catch {
    return;
  }
};

const normalizeDeviceStatus = (status?: string): string | undefined => {
  if (!status) return undefined;
  const value = status.toLowerCase();
  if (value === 'available') return 'active';
  if (value === 'active') return 'active';
  if (value === 'open') return 'connected';
  if (value === 'initializing') return 'connecting';
  if (value === 'timeout') return 'error';
  if (value === 'closing') return 'disconnected';
  return status;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDeviceState] = useState('');
  const [isServerOnline, setIsServerOnline] = useState(true);

  useEffect(() => {
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    const device = localStorage.getItem('gowa_device_id');
    if (sessionRaw) {
      setIsAuthenticated(true);
      if (device) setSelectedDeviceState(device);
    } else {
      const defaultSession = {
        id: 'default-session',
        username: localStorage.getItem('dashboard_username') || 'admin',
        loggedInAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(defaultSession));
      localStorage.setItem('gowa_authenticated', 'true');
      setIsAuthenticated(true);
    }
  }, []);

  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    try {
      await getAppStatus();
      setIsServerOnline(true);
      return true;
    } catch (error: unknown) {
      const err = (typeof error === 'object' && error !== null ? error : {}) as Record<string, unknown>;
      const code = typeof err.code === 'string' ? err.code : '';
      const message = typeof err.message === 'string' ? err.message : '';

      if (code === 'ERR_NETWORK' || message === 'Network Error') {
        setIsServerOnline(false);
        return false;
      }
      if ('response' in err && err.response) {
        setIsServerOnline(true);
        return true;
      }
      setIsServerOnline(false);
      return false;
    }
  }, []);

  const login = async (username: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedUsername = username.trim() || 'admin';
    const sessionData = {
      id: 'default-session',
      username: trimmedUsername,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    localStorage.setItem('gowa_authenticated', 'true');
    localStorage.setItem('dashboard_username', trimmedUsername);
    setIsAuthenticated(true);
    try {
      await refreshDevices();
      setIsServerOnline(true);
    } catch (error) {
      console.error('Failed to refresh devices after login:', error);
    }
    return { success: true };
  };

  const logout = () => {
    return;
  };

  const setSelectedDevice = (deviceId: string) => {
    localStorage.setItem('gowa_device_id', deviceId);
    setSelectedDeviceState(deviceId);
  };

  const refreshDevices = useCallback(async () => {
    try {
      const response = await getDevices();
      const storedNames = getStoredDeviceNames();
      const data = response.data || {};
      const deviceList =
        data.results ||
        data.devices ||
        data.data ||
        data ||
        [];
      const list = Array.isArray(deviceList)
        ? deviceList
            .map((raw: RawDevice) => {
              const id = typeof raw.id === 'string' ? raw.id : '';
              if (!id) return null;
              const name = storedNames[id] || (typeof raw.name === 'string' ? raw.name : undefined);
              const rawStatus: string | undefined =
                typeof raw.status === 'string'
                  ? raw.status
                  : typeof raw.state === 'string'
                  ? raw.state
                  : typeof raw.connection_state === 'string'
                  ? raw.connection_state
                  : typeof raw.connectionStatus === 'string'
                  ? raw.connectionStatus
                  : undefined;
              const status = normalizeDeviceStatus(rawStatus);
              const jid = typeof raw.jid === 'string' ? raw.jid : undefined;
              return { id, name, status, jid } as Device;
            })
            .filter((device): device is Device => Boolean(device))
        : [];
      setDevices(list);

      if (!selectedDevice && list.length > 0) {
        setSelectedDevice(list[0].id);
      }
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  }, [selectedDevice]);

  const setDeviceName = (deviceId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const currentNames = getStoredDeviceNames();
    const updatedNames: DeviceNameMap = { ...currentNames, [deviceId]: trimmed };
    saveDeviceNames(updatedNames);
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, name: trimmed } : device
      )
    );
  };

  useEffect(() => {
    if (isAuthenticated && devices.length === 0) {
      refreshDevices();
    }
  }, [isAuthenticated, devices.length, refreshDevices]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        devices,
        selectedDevice,
        isServerOnline,
        login,
        logout,
        setSelectedDevice,
        setDeviceName,
        refreshDevices,
        checkServerStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
