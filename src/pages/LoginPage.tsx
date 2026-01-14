import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, AlertCircle, Settings, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('gowa_base_url') || 'https://gowa.ekacode.web.id');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [checkingServer, setCheckingServer] = useState(true);
  const { login, isServerOnline, checkServerStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkServer = async () => {
      setCheckingServer(true);
      await checkServerStatus();
      setCheckingServer(false);
    };
    checkServer();
  }, [baseUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Save base URL before login attempt
    localStorage.setItem('gowa_base_url', baseUrl);

    const result = await login(username, password);
    
    if (result.success) {
      toast({
        title: 'Login Successful',
        description: 'Please select a device to continue.',
      });
      navigate('/');
    } else {
      setError(result.error || 'Login failed');
      toast({
        title: 'Login Failed',
        description: result.error || 'Invalid credentials or server unreachable.',
        variant: 'destructive',
      });
    }
    
    setLoading(false);
  };

  const handleBaseUrlChange = (url: string) => {
    setBaseUrl(url);
    localStorage.setItem('gowa_base_url', url);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <MessageSquare className="w-9 h-9 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">GOWA Control Panel</CardTitle>
          <CardDescription>WhatsApp Gateway Management Dashboard</CardDescription>
          
          {/* Server status indicator */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {checkingServer ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isServerOnline ? (
              <Wifi className="w-4 h-4 text-primary" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">
              {checkingServer ? 'Checking server...' : isServerOnline ? 'Server online' : 'Server offline'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {!isServerOnline && !checkingServer && (
            <Alert className="mb-4 border-border bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Issue</AlertTitle>
              <AlertDescription className="text-xs">
                Cannot connect to the GOWA server. This might be due to:
                <ul className="list-disc list-inside mt-1">
                  <li>CORS restrictions (browser security)</li>
                  <li>Server is offline or unreachable</li>
                  <li>Incorrect API URL</li>
                </ul>
                Try running the dashboard on the same domain as the API server.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full text-muted-foreground text-sm">
                  <Settings className="w-4 h-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <Label htmlFor="baseUrl">API Base URL</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  placeholder="https://gowa.ekacode.web.id"
                />
                <p className="text-xs text-muted-foreground">
                  Change this if your GOWA server is hosted elsewhere
                </p>
              </CollapsibleContent>
            </Collapsible>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Default credentials: admin / admin
          </p>
        </CardContent>
      </Card>
    </div>
  );
}