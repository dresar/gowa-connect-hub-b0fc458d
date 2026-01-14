import { useState, useEffect } from 'react';
import { RefreshCw, LogOut, Server, Smartphone, MessageSquare, Battery } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getAppStatus, getDeviceStatus, getDeviceInfo, reconnectDevice, logoutDevice } from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface ServerStatus {
  status: string;
  version?: string;
  uptime?: string;
}

interface DeviceStatusData {
  status: string;
  phone?: string;
  pushName?: string;
  battery?: number;
}

export default function DashboardPage() {
  const { selectedDevice } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusData | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const serverRes = await getAppStatus();
      setServerStatus(serverRes.data);

      if (selectedDevice) {
        const deviceRes = await getDeviceStatus(selectedDevice);
        const infoRes = await getDeviceInfo(selectedDevice);
        setDeviceStatus({
          ...deviceRes.data,
          ...infoRes.data
        });
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, [selectedDevice]);

  const handleReconnect = async () => {
    if (!selectedDevice) return;
    setActionLoading('reconnect');
    try {
      await reconnectDevice(selectedDevice);
      toast({ title: 'Reconnect initiated', description: 'Device is reconnecting...' });
      await fetchStatus();
    } catch (error) {
      toast({ title: 'Failed', description: 'Could not reconnect device', variant: 'destructive' });
    }
    setActionLoading('');
  };

  const handleLogout = async () => {
    if (!selectedDevice) return;
    setActionLoading('logout');
    try {
      await logoutDevice(selectedDevice);
      toast({ title: 'Logged out', description: 'Device has been logged out' });
      await fetchStatus();
    } catch (error) {
      toast({ title: 'Failed', description: 'Could not logout device', variant: 'destructive' });
    }
    setActionLoading('');
  };

  if (loading) return <PageLoader />;

  const stats = [
    { 
      title: 'Messages Today', 
      value: '156', 
      icon: MessageSquare, 
      color: 'text-primary' 
    },
    { 
      title: 'Battery Level', 
      value: deviceStatus?.battery ? `${deviceStatus.battery}%` : 'N/A', 
      icon: Battery, 
      color: 'text-green-500' 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your WhatsApp Gateway</p>
        </div>
        <Button variant="outline" onClick={fetchStatus}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <StatusBadge status={serverStatus?.status || 'unknown'} />
            {serverStatus?.version && (
              <p className="text-xs text-muted-foreground mt-2">v{serverStatus.version}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Device Status</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {selectedDevice ? (
              <>
                <StatusBadge status={deviceStatus?.status || 'unknown'} />
                {deviceStatus?.pushName && (
                  <p className="text-xs text-muted-foreground mt-2">{deviceStatus.pushName}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No device selected</p>
            )}
          </CardContent>
        </Card>

        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common device operations</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button 
              onClick={handleReconnect} 
              disabled={!selectedDevice || actionLoading === 'reconnect'}
            >
              {actionLoading === 'reconnect' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Reconnect Device
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              disabled={!selectedDevice || actionLoading === 'logout'}
            >
              {actionLoading === 'logout' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Logout Device
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Info</CardTitle>
            <CardDescription>Current device details</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDevice ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device ID</span>
                  <span className="font-medium">{selectedDevice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{deviceStatus?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{deviceStatus?.pushName || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Please select a device from the header dropdown</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
