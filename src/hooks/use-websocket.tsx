import { useEffect, useRef, useState, useCallback } from 'react';
import { useLogs } from '@/contexts/LogContext';

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const { addLog } = useLogs();

  const connect = useCallback((webhookUrl?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Default to a simulated connection for demo
    const baseUrl = localStorage.getItem('gowa_base_url') || 'https://gowa.ekacode.web.id';
    const wsUrl = webhookUrl || baseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        addLog({
          type: 'response',
          method: 'WS',
          url: wsUrl,
          data: { message: 'WebSocket connected' },
          status: 200
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const newEvent: WebhookEvent = {
            id: crypto.randomUUID(),
            type: data.type || 'unknown',
            timestamp: new Date(),
            data
          };
          setEvents(prev => [newEvent, ...prev].slice(0, 100));
          
          // Show notification for incoming messages
          if (data.type === 'message' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('New WhatsApp Message', {
              body: data.message?.text || 'New message received',
              icon: '/favicon.ico'
            });
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [addLog]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Simulate events for demo purposes when real WebSocket is not available
  const simulateEvent = useCallback((eventData: any) => {
    const newEvent: WebhookEvent = {
      id: crypto.randomUUID(),
      type: eventData.type || 'message',
      timestamp: new Date(),
      data: eventData
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    events,
    connect,
    disconnect,
    clearEvents,
    simulateEvent
  };
}
