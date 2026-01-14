import { useState, useEffect } from 'react';
import { Plus, Trash2, QrCode, Key, RefreshCw, Smartphone, Loader2 } from 'lucide-react';
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
  createDevice, 
  deleteDevice, 
  getDeviceQR, 
  loginWithCode, 
  reconnectDevice 
} from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  name?: string;
  status?: string;
}

export default function DeviceManagerPage() {
  const { refreshDevices, setSelectedDevice } = useAuth();
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
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await getDevices();
      setDevices(response.data.devices || response.data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch devices', variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

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
    setActionLoading(deviceId);
    try {
      const response = await getDeviceQR(deviceId);
      setQrCode(response.data.qr || response.data.qrCode || '');
      setQrModalOpen(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to get QR code', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handlePairingCode = async () => {
    setActionLoading('pairing');
    try {
      await loginWithCode(selectedDeviceId, pairingPhone);
      toast({ title: 'Success', description: 'Pairing code sent to your phone' });
      setPairingModalOpen(false);
      setPairingPhone('');
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
        {devices.length === 0 ? (
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
                    onClick={() => setSelectedDevice(device.id)}
                  >
                    Select
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
            <DialogDescription>Scan this QR code with your WhatsApp app</DialogDescription>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPairingModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePairingCode} disabled={actionLoading === 'pairing'}>
              {actionLoading === 'pairing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Code
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
    </div>
  );
}
