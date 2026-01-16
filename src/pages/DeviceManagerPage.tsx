import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, QrCode, Key, RefreshCw, Smartphone, Loader2, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDevices,
  getDeviceStatus,
  createDevice,
  deleteDevice,
  appLogin,
  appLoginWithCode,
  reconnectDevice,
  logoutDevice,
} from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  name?: string;
  status?: string;
}

type RawDevice = {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  state?: unknown;
  connection_state?: unknown;
  connectionStatus?: unknown;
};

export default function DeviceManagerPage() {
  const { refreshDevices, setDeviceName, setSelectedDevice } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Form data
  const [newDeviceId, setNewDeviceId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameDeviceId, setRenameDeviceId] = useState('');
  const [renameName, setRenameName] = useState('');

  const normalizeStatus = (status?: string): string | undefined => {
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

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDevices();
      const storedNamesRaw = localStorage.getItem('gowa_device_names');
      let storedNames: Record<string, string> = {};
      if (storedNamesRaw) {
        try {
          const parsed = JSON.parse(storedNamesRaw);
          if (typeof parsed === 'object' && parsed !== null) {
            storedNames = parsed as Record<string, string>;
          }
        } catch {
          storedNames = {};
        }
      }
      const data = response.data || {};
      const deviceList =
        data.results ||
        data.devices ||
        data.data ||
        data ||
        [];
      const list = Array.isArray(deviceList)
        ? deviceList.map((raw: RawDevice) => {
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
            const status = normalizeStatus(rawStatus);
            return { id, name, status } as Device;
          }).filter((device): device is Device => Boolean(device))
        : [];
      setDevices(list);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch devices', variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    const shouldTrack =
      selectedDeviceId &&
      ((qrModalOpen && Boolean(qrCode)) || (pairingModalOpen && Boolean(pairingCode)));

    if (!shouldTrack) return;

    const interval = setInterval(async () => {
      try {
        const response = await getDeviceStatus(selectedDeviceId);
        const data = response.data || {};
        const results =
          typeof data.results === 'object' && data.results !== null ? data.results : {};
        const isLoggedIn =
          typeof (results as { is_logged_in?: boolean }).is_logged_in === 'boolean'
            ? (results as { is_logged_in?: boolean }).is_logged_in
            : false;

        if (isLoggedIn) {
          clearInterval(interval);
          setQrModalOpen(false);
          setQrCode('');
          setPairingModalOpen(false);
          setPairingCode('');
          setPairingPhone('');
          toast({
            title: 'Device connected',
            description: 'WhatsApp device is now connected.',
          });
          await fetchDevices();
        }
      } catch {
        return;
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [qrModalOpen, pairingModalOpen, qrCode, pairingCode, selectedDeviceId, fetchDevices, toast]);

  const handleAddDevice = async () => {
    setActionLoading('add');
    try {
      await createDevice(newDeviceId || undefined);
      toast({ title: 'Success', description: 'Device created successfully' });
      setAddModalOpen(false);
      setNewDeviceId('');
      await fetchDevices();
      await refreshDevices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create device', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleGetQR = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setSelectedDevice(deviceId);
    setActionLoading(deviceId);
    try {
      const response = await appLogin();
      const data = response.data || {};
      const results = typeof data.results === 'object' && data.results !== null ? data.results : {};
      const qr =
        (results as { qr_link?: string }).qr_link ||
        (data as { qr?: string }).qr ||
        (data as { qrCode?: string }).qrCode ||
        '';
      setQrCode(qr);
      setQrModalOpen(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to get QR code', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handlePairingCode = async () => {
    setActionLoading('pairing');
    try {
      if (selectedDeviceId) {
        setSelectedDevice(selectedDeviceId);
      }
      const response = await appLoginWithCode(pairingPhone);
      const data = response.data || {};
      const results = typeof data.results === 'object' && data.results !== null ? data.results : {};
      const code =
        (results as { pair_code?: string }).pair_code ||
        (data as { pair_code?: string }).pair_code ||
        '';
      setPairingCode(code);
      if (!code) {
        toast({ title: 'Error', description: 'No pairing code received', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Pairing code generated. Enter it on your device.' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send pairing code', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleDeleteDevice = async () => {
    setActionLoading('delete');
    try {
      await deleteDevice(selectedDeviceId);
      toast({ title: 'Success', description: 'Device deleted successfully' });
      setDeleteModalOpen(false);
      await fetchDevices();
      await refreshDevices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete device', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleReconnect = async (deviceId: string) => {
    setActionLoading(deviceId);
    try {
      await reconnectDevice(deviceId);
      toast({ title: 'Success', description: 'Reconnecting device...' });
      await fetchDevices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reconnect', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleLogout = async (deviceId: string) => {
    setActionLoading(deviceId);
    try {
      await logoutDevice(deviceId);
      toast({ title: 'Success', description: 'Device logged out successfully' });
      await fetchDevices();
      await refreshDevices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to logout device', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleOpenRename = (device: Device) => {
    setRenameDeviceId(device.id);
    setRenameName(device.name || '');
    setRenameModalOpen(true);
  };

  const handleSaveRename = () => {
    const value = renameName.trim();
    if (!value) {
      toast({
        title: 'Invalid name',
        description: 'Device name cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    setDeviceName(renameDeviceId, value);
    setDevices((prev) =>
      prev.map((device) =>
        device.id === renameDeviceId ? { ...device, name: value } : device
      )
    );
    setRenameModalOpen(false);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Device Manager</h1>
          <p className="text-muted-foreground">Manage your WhatsApp devices</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!Array.isArray(devices) || devices.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No devices found</h3>
              <p className="text-muted-foreground mb-4">Add your first device to get started</p>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          devices.map((device) => (
            <Card key={device.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{device.name || device.id}</CardTitle>
                  <StatusBadge status={device.status || 'unknown'} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">ID:</span> {device.id}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleGetQR(device.id)}
                    disabled={actionLoading === device.id}
                  >
                    {actionLoading === device.id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4 mr-1" />
                    )}
                    QR Login
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedDeviceId(device.id);
                      setPairingModalOpen(true);
                    }}
                  >
                    <Key className="w-4 h-4 mr-1" />
                    Pairing
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleReconnect(device.id)}
                    disabled={actionLoading === device.id}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reconnect
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenRename(device)}
                  >
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLogout(device.id)}
                    disabled={actionLoading === device.id}
                  >
                    {actionLoading === device.id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-1" />
                    )}
                    Logout
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      setSelectedDeviceId(device.id);
                      setDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Device Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
            <DialogDescription>Create a new WhatsApp device connection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deviceId">Custom Device ID (optional)</Label>
              <Input
                id="deviceId"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="Leave empty for auto-generated ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDevice} disabled={actionLoading === 'add'}>
              {actionLoading === 'add' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code with your WhatsApp app. This dialog will close automatically when
              the device is connected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">No QR code available</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => handleGetQR(selectedDeviceId)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pairing Code Modal */}
      <Dialog open={pairingModalOpen} onOpenChange={setPairingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login with Pairing Code</DialogTitle>
            <DialogDescription>Enter your phone number to receive a pairing code</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={pairingPhone}
                onChange={(e) => setPairingPhone(e.target.value)}
                placeholder="e.g., 6281234567890"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use your full phone number with country code.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                1. Open WhatsApp on your phone, 2. Tap Linked devices, 3. Choose Link with pairing code, 4. Enter the code below.
              </p>
              {pairingCode && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-center text-muted-foreground">
                    Enter this code on your WhatsApp device
                  </p>
                  <div className="flex justify-center">
                    <div className="px-4 py-2 rounded-xl border border-border bg-card text-2xl font-semibold font-mono tracking-[0.35em]">
                      {pairingCode}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPairingModalOpen(false);
                setPairingPhone('');
                setPairingCode('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePairingCode} disabled={actionLoading === 'pairing'}>
              {actionLoading === 'pairing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Get Pairing Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this device? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteDevice} disabled={actionLoading === 'delete'}>
              {actionLoading === 'delete' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Device</DialogTitle>
            <DialogDescription>Set a custom name for this device</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Enter device name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
