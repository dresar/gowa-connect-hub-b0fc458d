import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getVariant = () => {
    switch (status.toLowerCase()) {
      case 'connected':
      case 'online':
        return 'default';
      case 'connecting':
      case 'pending':
        return 'secondary';
      case 'disconnected':
      case 'offline':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getColor = () => {
    switch (status.toLowerCase()) {
      case 'connected':
      case 'online':
        return 'bg-green-500';
      case 'connecting':
      case 'pending':
        return 'bg-yellow-500';
      case 'disconnected':
      case 'offline':
        return 'bg-muted';
      case 'error':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  return (
    <Badge variant={getVariant()} className="gap-2">
      <span className={`w-2 h-2 rounded-full ${getColor()}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
