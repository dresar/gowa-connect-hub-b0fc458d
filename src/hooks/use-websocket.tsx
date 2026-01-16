import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLogs } from '@/contexts/LogContext';

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
  const socketRef = useRef<Socket | null>(null);
  const { addLog } = useLogs();

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  const connect = useCallback(() => {
    if (socketRef.current) {
      return;
    }

    try {
      const fallback = 'http://localhost:3004';
      const url =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('gowa_bridge_url') || fallback
          : fallback;

      const socket = io(url, {
        transports: ['websocket'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        addLog({
          type: 'response',
          method: 'WS',
          url,
          data: { message: 'Socket.io connected' },
          status: 200,
        });
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('gowa-event', (data: unknown) => {
        try {
          const record = isRecord(data) ? data : {};
          const type =
            isRecord(record) && typeof record.type === 'string'
              ? record.type
              : isRecord(record) && typeof record.event === 'string'
              ? (record.event as string)
              : 'unknown';
          const newEvent: WebhookEvent = {
            id: generateId(),
            type,
            timestamp: new Date(),
            data,
          };
          setEvents(prev => [newEvent, ...prev].slice(0, 100));

          if (
            type.toLowerCase() === 'message' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            let body = 'New message received';
            if (isRecord(record)) {
              if (isRecord((record as { message?: unknown }).message) &&
                typeof (record as { message: { text?: string } }).message.text === 'string') {
                body = (record as { message: { text: string } }).message.text;
              } else if (
                isRecord((record as { payload?: unknown }).payload) &&
                typeof (record as { payload: { body?: string } }).payload.body === 'string'
              ) {
                body = (record as { payload: { body: string } }).payload.body;
              }
            }
            new Notification('New WhatsApp Message', {
              body,
              icon: '/favicon.ico',
            });
          }
        } catch (e) {
          console.error('Failed to handle socket event:', e);
        }
      });
    } catch (error) {
      console.error('Failed to connect Socket.io:', error);
    }
  }, [addLog]);

  const disconnect = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.disconnect();
    socketRef.current = null;
    setIsConnected(false);
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
