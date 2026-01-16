import { useState, useEffect, useRef } from 'react';
import { Settings, Server, User, Smartphone, Save, Loader2, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getGowaBaseUrl } from '@/lib/api';
import axios from 'axios';

export default function SettingsPage() {
  const { devices, selectedDevice, setSelectedDevice, refreshDevices } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [baseUrl, setBaseUrl] = useState('');
  const [wsStatus, setWsStatus] = useState<string | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);
  const [capturedEvent, setCapturedEvent] = useState<unknown | null>(null);
  const [listening, setListening] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setBaseUrl(
      localStorage.getItem('gowa_base_url') ||
        import.meta.env.API_URL ||
        'http://192.168.18.50:3003'
    );
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const handleTestConnection = async () => {
    setSaving(true);

    try {
      const trimmedBaseUrl = baseUrl.replace(/\/+$/, '');
      const url = `${trimmedBaseUrl}/app/status`;

      const response = await axios.get(url);

      if (response.status >= 200 && response.status < 300) {
        localStorage.setItem('gowa_base_url', trimmedBaseUrl);

        toast({
          title: 'Connection successful',
          description: 'Connection settings saved to your browser.',
        });

        await refreshDevices();
        setBaseUrl(trimmedBaseUrl);
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: 'Could not connect with the provided URL.',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  const handleStartListening = () => {
    if (listening) return;

    setWsError(null);
    setCapturedEvent(null);

    const effectiveBaseUrl = baseUrl || getGowaBaseUrl();
    const trimmedBaseUrl = effectiveBaseUrl.replace(/\/+$/, '');
    const path = selectedDevice
      ? `/ws?device_id=${encodeURIComponent(selectedDevice)}`
      : '/ws';
    const wsUrl = trimmedBaseUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://') + path;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      setListening(true);
      setWsStatus('Connecting to WebSocket...');

      socket.onopen = () => {
        setWsStatus('Connected. Listening for incoming messages...');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setCapturedEvent(data);
          setWsStatus('Message captured');
          setListening(false);
          socket.close();
        } catch {
          setWsError('Failed to parse WebSocket message.');
        }
      };

      socket.onerror = () => {
        setWsError('WebSocket error. Please verify the API URL and CORS.');
        setListening(false);
      };

      socket.onclose = () => {
        if (!capturedEvent) {
          setWsStatus('Connection closed.');
        }
        setListening(false);
      };
    } catch {
      setWsError('Failed to open WebSocket connection.');
      setListening(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      await refreshDevices();
      toast({ title: 'Settings refreshed!', description: 'Device list has been updated.' });
    } catch (error) {
      toast({ 
        title: 'Connection failed', 
        description: 'Could not connect to the API with current environment settings.',
        variant: 'destructive' 
      });
    }
    
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your API connection and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              API Configuration
            </CardTitle>
            <CardDescription>Configure the GOWA API endpoint</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="base-url">Base URL</Label>
              <Input
                id="base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://gowa.ekacode.web.id"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The API server URL (without trailing slash)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Device Selection
            </CardTitle>
            <CardDescription>Select the active device for API operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Active Device</Label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.length === 0 ? (
                    <SelectItem value="no-device" disabled>No devices available</SelectItem>
                  ) : (
                    devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name || device.id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This device ID will be used by the API server
              </p>
            </div>
            <Button variant="outline" onClick={refreshDevices}>
              Refresh Devices
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Test Connection & Save
            </CardTitle>
            <CardDescription>Check API connectivity and store credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTestConnection} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Settings are stored locally in your browser
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Webhook & Event Tester
          </CardTitle>
          <CardDescription>
            Open a WebSocket connection and capture the first incoming event payload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleStartListening} disabled={listening}>
            {listening ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Listening...
              </>
            ) : (
              'Start Listening'
            )}
          </Button>
          {wsStatus && (
            <p className="text-xs text-muted-foreground">
              {wsStatus}
            </p>
          )}
          {wsError && (
            <p className="text-xs text-destructive">
              {wsError}
            </p>
          )}
          {capturedEvent && (
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-medium px-2 py-1">
                Success: Message Captured
              </span>
              <pre className="mt-2 p-3 rounded bg-secondary text-secondary-foreground text-xs overflow-x-auto font-mono">
                {JSON.stringify(capturedEvent, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
