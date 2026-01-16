import { Activity, Trash2, Copy, CheckCircle, XCircle, AlertCircle, PlugZap, Plug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLogs } from '@/contexts/LogContext';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/contexts/AuthContext';
import { getGowaBaseUrl } from '@/lib/api';

export default function WebhookLogsPage() {
  const { logs, clearLogs } = useLogs();
  const { toast } = useToast();
  const { isConnected, events, connect, disconnect, clearEvents } = useWebSocket();
  const { selectedDevice } = useAuth();

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

  const buildWsUrl = () => {
    const base = getGowaBaseUrl();
    const path = selectedDevice
      ? `/ws?device_id=${encodeURIComponent(selectedDevice)}`
      : '/ws';
    return base.replace('https://', 'wss://').replace('http://', 'ws://') + path;
  };

  const handleConnect = () => {
    if (!selectedDevice) {
      toast({
        title: 'Device belum dipilih',
        description: 'Pilih device di halaman Device Manager terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }
    const wsUrl = buildWsUrl();
    connect(wsUrl);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleClearEvents = () => {
    clearEvents();
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
            Webhook Events (WebSocket)
          </CardTitle>
          <CardDescription>
            Terhubung ke WebSocket backend untuk menangkap event real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge variant={isConnected ? 'default' : 'outline'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {selectedDevice && (
                <span className="text-xs text-muted-foreground">
                  Device: <span className="font-mono">{selectedDevice}</span>
                </span>
              )}
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
