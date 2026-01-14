import { LogOut, Smartphone, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppHeader() {
  const { devices, selectedDevice, setSelectedDevice, logout } = useAuth();
  const username = localStorage.getItem('gowa_username') || 'admin';

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <SidebarTrigger>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SidebarTrigger>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Select Device" />
            </SelectTrigger>
            <SelectContent>
              {devices.length === 0 ? (
                <SelectItem value="no-device" disabled>No devices</SelectItem>
              ) : (
                devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name || device.id}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <span className="text-sm text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{username}</span>
          </span>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
