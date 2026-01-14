import { useState, useEffect } from 'react';
import { Settings, Server, User, Smartphone, Save, Loader2 } from 'lucide-react';
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

export default function SettingsPage() {
  const { devices, selectedDevice, setSelectedDevice, refreshDevices } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Settings state
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setBaseUrl(localStorage.getItem('gowa_base_url') || 'https://gowa.ekacode.web.id');
    setUsername(localStorage.getItem('gowa_username') || 'admin');
    setPassword(localStorage.getItem('gowa_password') || 'admin');
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    
    localStorage.setItem('gowa_base_url', baseUrl);
    localStorage.setItem('gowa_username', username);
    localStorage.setItem('gowa_password', password);
    
    try {
      await refreshDevices();
      toast({ title: 'Settings saved!', description: 'Your configuration has been updated.' });
    } catch (error) {
      toast({ 
        title: 'Connection failed', 
        description: 'Could not connect with the new settings. Please verify the credentials.',
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
              <User className="w-5 h-5" />
              Authentication
            </CardTitle>
            <CardDescription>API credentials (Basic Auth)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="api-username">Username</Label>
              <Input
                id="api-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="api-password">Password</Label>
              <Input
                id="api-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
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
                This device ID will be sent as X-Device-Id header
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
              Save Configuration
            </CardTitle>
            <CardDescription>Apply your settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Settings are stored locally in your browser
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
