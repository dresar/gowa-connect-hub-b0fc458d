import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, LogOut, Server, Smartphone, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getAppStatus, getChats, getDeviceStatus, getDeviceInfo, reconnectDevice, logoutDevice } from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { ChartContainer, type ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';

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

interface ChatSummary {
  totalChats: number;
  totalUnread: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const unwrapData = (payload: unknown): unknown => {
  let current: unknown = payload;
  while (isRecord(current) && isRecord(current.data)) {
    current = current.data;
  }
  return current;
};

const getString = (obj: unknown, key: string) =>
  isRecord(obj) && typeof obj[key] === 'string' ? (obj[key] as string) : undefined;

const getNumber = (obj: unknown, key: string) =>
  isRecord(obj) && typeof obj[key] === 'number' ? (obj[key] as number) : undefined;

const coerceNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const normalizeArray = (payload: unknown): unknown[] => {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data;
  if (isRecord(data)) {
    const candidates = [data.chats, data.messages, data.results, data.data];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
  }
  return [];
};

export default function DashboardPage() {
  const { selectedDevice, devices } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusData | null>(null);
  const [chatSummary, setChatSummary] = useState<ChatSummary>({ totalChats: 0, totalUnread: 0 });
  const [actionLoading, setActionLoading] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoading(true);

    try {
      const serverRes = await getAppStatus();
      const serverData = unwrapData(serverRes.data);
      const serverStatusValue =
        getString(serverData, 'status') ||
        getString(serverData, 'connection') ||
        'online';

      setServerStatus({
        status: serverStatusValue,
        version: getString(serverData, 'version'),
        uptime: getString(serverData, 'uptime'),
      });
    } catch (error) {
      console.error('Failed to fetch server status:', error);
      toast({
        title: 'Gagal memuat server status',
        description: 'Tidak bisa terhubung ke API. Cek server atau menu Settings.',
        variant: 'destructive',
      });
      setServerStatus(null);
      setDeviceStatus(null);
      setChatSummary({ totalChats: 0, totalUnread: 0 });
      setLoading(false);
      return;
    }

    try {
      const chatsRes = await getChats({ limit: 50, offset: 0 });
      const list = normalizeArray(chatsRes.data);
      const totalUnread = list.reduce<number>((acc, chat) => {
        if (!isRecord(chat)) return acc;
        const unread =
          coerceNumber(chat.unreadCount) ??
          coerceNumber(chat.unread_count) ??
          coerceNumber(chat.unread) ??
          0;
        return acc + unread;
      }, 0);
      setChatSummary({ totalChats: list.length, totalUnread });
    } catch (error) {
      console.error('Failed to fetch chat summary:', error);
      setChatSummary({ totalChats: 0, totalUnread: 0 });
    }

    if (selectedDevice) {
      const currentMeta = devices.find((d) => d.id === selectedDevice);
      try {
        const deviceRes = await getDeviceStatus(selectedDevice);
        const infoRes = await getDeviceInfo(selectedDevice);
        const statusData = unwrapData(deviceRes.data);
        const infoData = unwrapData(infoRes.data);
        const deviceStatusValue =
          getString(statusData, 'status') ||
          getString(infoData, 'status') ||
          'online';

        setDeviceStatus({
          status: deviceStatusValue,
          phone:
            getString(infoData, 'phone') ||
            getString(statusData, 'phone') ||
            getString(infoData, 'jid') ||
            getString(statusData, 'jid'),
          pushName:
            getString(infoData, 'pushName') ||
            getString(infoData, 'name') ||
            getString(statusData, 'pushName') ||
            getString(statusData, 'name') ||
            currentMeta?.name ||
            selectedDevice,
          battery:
            getNumber(statusData, 'battery') ??
            getNumber(infoData, 'battery'),
        });
      } catch (error) {
        console.error('Failed to fetch device status:', error);
        setDeviceStatus({
          status: 'offline',
          phone: undefined,
          pushName: undefined,
          battery: undefined,
        });
      }
    } else {
      setDeviceStatus(null);
    }

    setLoading(false);
  }, [selectedDevice, devices, toast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
      title: 'Total Chats',
      value: String(chatSummary.totalChats),
      icon: MessageSquare,
      color: 'text-primary',
    },
    {
      title: 'Unread Messages',
      value: String(chatSummary.totalUnread),
      icon: MessageSquare,
      color: 'text-primary',
    },
  ];

  const chatChartConfig = {
    total: {
      label: 'Total Chats',
      color: 'hsl(var(--primary))',
    },
    unread: {
      label: 'Unread Messages',
      color: 'hsl(var(--destructive))',
    },
  } satisfies ChartConfig;

  const chatChartData = [
    {
      label: 'Chats',
      total: chatSummary.totalChats,
      unread: chatSummary.totalUnread,
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
            {serverStatus?.status ? (
              <StatusBadge status={serverStatus.status} />
            ) : (
              <p className="text-sm text-muted-foreground">N/A</p>
            )}
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
                {deviceStatus?.status ? (
                  <StatusBadge status={deviceStatus.status} />
                ) : (
                  <p className="text-sm text-muted-foreground">N/A</p>
                )}
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

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Chat Overview</CardTitle>
            <CardDescription>Comparison between total chats and unread messages</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chatChartConfig} className="h-60">
              <ResponsiveContainer>
                <BarChart data={chatChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unread" fill="var(--color-unread)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
                  <span className="font-medium">
                    {deviceStatus?.phone && deviceStatus.phone.trim() !== ''
                      ? deviceStatus.phone
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">
                    {deviceStatus?.pushName && deviceStatus.pushName.trim() !== ''
                      ? deviceStatus.pushName
                      : '-'}
                  </span>
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
