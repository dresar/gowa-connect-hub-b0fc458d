import { useEffect, useRef, useState, useCallback } from 'react';
import { useLogs } from '@/contexts/LogContext';
import { getGowaBaseUrl } from '@/lib/api';

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: unknown;
}

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const { addLog } = useLogs();

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  const connect = useCallback((webhookUrl?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const baseUrl = webhookUrl || getGowaBaseUrl();

    const wsUrl =
      webhookUrl ||
      baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');

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
          const data: unknown = JSON.parse(event.data);
          const type =
            isRecord(data) && typeof data.type === 'string'
              ? data.type
              : isRecord(data) && typeof data.event === 'string'
              ? (data.event as string)
              : isRecord(data) && typeof data.code === 'string'
              ? (data.code as string)
              : 'unknown';
          const newEvent: WebhookEvent = {
            id: generateId(),
            type,
            timestamp: new Date(),
            data
          };
          setEvents(prev => [newEvent, ...prev].slice(0, 100));
          
          if (type.toLowerCase() === 'message' && 'Notification' in window && Notification.permission === 'granted') {
            let body = 'New message received';
            if (isRecord(data)) {
              if (isRecord(data.message) && typeof data.message.text === 'string') {
                body = data.message.text;
              } else if (isRecord(data.payload) && typeof data.payload.body === 'string') {
                body = data.payload.body;
              }
            }
            new Notification('New WhatsApp Message', {
              body,
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

  const simulateEvent = useCallback((eventData: unknown) => {
    const type =
      typeof eventData === 'object' &&
      eventData !== null &&
      'type' in eventData &&
      typeof (eventData as Record<string, unknown>).type === 'string'
        ? (eventData as Record<string, unknown>).type as string
        : 'message';
    const newEvent: WebhookEvent = {
      id: generateId(),
      type,
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
