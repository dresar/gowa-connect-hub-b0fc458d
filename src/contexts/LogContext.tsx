import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'request' | 'response' | 'error';
  method?: string;
  url?: string;
  data?: unknown;
  status?: number;
}

interface LogContextType {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const LogProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const clearLogs = () => setLogs([]);

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLogs = () => {
  const context = useContext(LogContext);
  if (!context) throw new Error('useLogs must be used within LogProvider');
  return context;
};
