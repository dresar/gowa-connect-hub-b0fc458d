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

const API_URL = import.meta.env.API_URL || 'http://192.168.18.50:3003';

export default function LoginPage() {
  const [username, setUsername] = useState('');
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
  }, [checkServerStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim() || 'guest';

    setLoading(true);

    try {
      const result = await login(trimmedUsername);

      if (result.success) {
        localStorage.setItem('dashboard_username', trimmedUsername);
        toast({
          title: 'Welcome',
          description: 'Kamu sudah masuk ke dashboard.',
        });
        navigate('/');
      } else {
        setError(result.error || 'Login failed');
        toast({
          title: 'Login Failed',
          description: result.error || 'Tidak bisa masuk ke dashboard.',
          variant: 'destructive',
        });
      }
    } catch {
      setError('Terjadi kesalahan saat memproses login.');
      toast({
        title: 'Login Error',
        description: 'Terjadi masalah tak terduga. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full text-muted-foreground text-sm">
                  <Settings className="w-4 h-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Connection Info
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <Label htmlFor="baseUrl">API Base URL</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  value={API_URL}
                  readOnly
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  This URL comes from your API_URL environment variable.
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
                'Enter Dashboard'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
