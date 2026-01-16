import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Trash2, Copy, CheckCircle, XCircle, AlertCircle, PlugZap, Plug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLogs } from '@/contexts/LogContext';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';

interface WebhookLogEntry {
  id: string;
  timestamp: string;
  event?: string;
  device_id?: string;
  preview?: string;
}

const getBridgeBaseUrl = () => {
  const fallback = 'http://localhost:3004';
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem('gowa_bridge_url') || fallback;
  return stored.replace(/\/+$/, '');
};

export default function WebhookLogsPage() {
  const { logs, clearLogs } = useLogs();
  const { toast } = useToast();
  const { isConnected, events, connect, disconnect, clearEvents } = useWebSocket();
  const [webhookEnabled, setWebhookEnabled] = useState<boolean | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const bridgeBaseUrl = useMemo(() => getBridgeBaseUrl(), []);

  const copyLog = (log: typeof logs[0]) => {
    navigator.clipboard.writeText(JSON.stringify(log.data, null, 2));
    toast({ title: 'Copied to clipboard' });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'response':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status?: number) => {
    if (!status) return null;
    const variant = status >= 200 && status < 300 ? 'default' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleClearEvents = () => {
    clearEvents();
  };

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const response = await fetch(`${bridgeBaseUrl}/webhook/settings`);
      const data = await response.json();
      if (typeof data.enabled === 'boolean') {
        setWebhookEnabled(data.enabled);
      } else {
        setWebhookEnabled(true);
      }
    } catch {
      setWebhookEnabled(true);
    }
    setLoadingSettings(false);
  }, [bridgeBaseUrl]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`${bridgeBaseUrl}/webhook/logs`);
      const data = await response.json();
      const raw = Array.isArray(data.logs) ? data.logs : data;
      if (Array.isArray(raw)) {
        setWebhookLogs(raw as WebhookLogEntry[]);
      } else {
        setWebhookLogs([]);
      }
    } catch {
      setWebhookLogs([]);
    }
    setLoadingLogs(false);
  }, [bridgeBaseUrl]);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, [fetchSettings, fetchLogs]);

  const handleToggleWebhook = async (value: boolean) => {
    setWebhookEnabled(value);
    setLoadingSettings(true);
    try {
      const response = await fetch(`${bridgeBaseUrl}/webhook/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: value }),
      });
      const data = await response.json();
      if (typeof data.enabled === 'boolean') {
        setWebhookEnabled(data.enabled);
      }
    } catch {
      setWebhookEnabled(prev => !prev);
    }
    setLoadingSettings(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Webhook & Logs</h1>
          <p className="text-muted-foreground">Monitor API responses and webhook events</p>
        </div>
        <Button variant="outline" onClick={clearLogs}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Webhook Settings
          </CardTitle>
          <CardDescription>
            Pengaturan webhook bridge dan status penyimpanan ke file JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Webhook Status</span>
                {webhookEnabled !== null && (
                  <Badge variant={webhookEnabled ? 'default' : 'outline'}>
                    {webhookEnabled ? 'On' : 'Off'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Bridge URL: <span className="font-mono">{bridgeBaseUrl}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={webhookEnabled ?? true}
                disabled={loadingSettings}
                onCheckedChange={handleToggleWebhook}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Webhook Events (WebSocket)
          </CardTitle>
          <CardDescription>
            Terhubung ke Socket.io bridge untuk menangkap event real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge variant={isConnected ? 'default' : 'outline'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isConnected ? 'outline' : 'default'}
                onClick={isConnected ? handleDisconnect : handleConnect}
              >
                {isConnected ? (
                  <>
                    <Plug className="w-4 h-4 mr-1" />
                    Disconnect
                  </>
                ) : (
                  <>
                    <PlugZap className="w-4 h-4 mr-1" />
                    Connect
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearEvents} disabled={!events.length}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Events
              </Button>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium">Belum ada event</h3>
              <p className="text-xs text-muted-foreground">
                Klik &quot;Connect&quot; lalu kirim pesan atau event dari device WhatsApp.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[260px]">
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border border-border bg-muted/40 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{event.type || 'event'}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="mt-1 p-2 rounded bg-secondary text-secondary-foreground overflow-x-auto font-mono text-[10px]">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Webhook Logs (JSON)
          </CardTitle>
          <CardDescription>
            Riwayat webhook yang disimpan di file db/webhook.json pada backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading webhook logs...
            </div>
          ) : webhookLogs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Belum ada webhook yang tercatat.
            </div>
          ) : (
            <ScrollArea className="h-[260px]">
              <div className="space-y-3">
                {webhookLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-border bg-muted/40 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.event || 'event'}</Badge>
                        {log.device_id && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {log.device_id}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.preview && (
                      <p className="mt-1 text-[11px] text-foreground line-clamp-2">
                        {log.preview}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-time Logs
          </CardTitle>
          <CardDescription>
            API response logs from your actions. New logs appear at the top.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No logs yet</h3>
              <p className="text-muted-foreground">
                Logs will appear here when you perform actions in other pages
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(log.type)}
                        <span className="font-mono text-sm font-medium">{log.method}</span>
                        <span className="text-sm text-muted-foreground">{log.url}</span>
                        {getStatusBadge(log.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => copyLog(log)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {log.data && (
                      <pre className="mt-2 p-3 rounded bg-secondary text-secondary-foreground text-xs overflow-x-auto font-mono">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
