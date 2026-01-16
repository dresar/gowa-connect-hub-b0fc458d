import React from 'react';
import { Smartphone } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface DeviceSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  showIcon?: boolean;
}

export default function DeviceSelector({ 
  value, 
  onChange, 
  className,
  showIcon = true 
}: DeviceSelectorProps) {
  const { devices, selectedDevice, setSelectedDevice } = useAuth();
  
  // Use props if provided, otherwise fallback to global context
  const currentValue = value !== undefined ? value : selectedDevice;
  const handleChange = onChange || setSelectedDevice;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && <Smartphone className="w-4 h-4 text-muted-foreground" />}
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="w-full bg-background">
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
  );
}
