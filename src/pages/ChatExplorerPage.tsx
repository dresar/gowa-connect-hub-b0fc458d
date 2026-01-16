import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  MessageSquare,
  MoreVertical,
  Search,
  Phone,
  Video,
  Image as ImageIcon,
  FileText,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Paperclip,
  File as FileIcon,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import DeviceSelector from '@/components/DeviceSelector';
import { useWebSocket } from '@/hooks/use-websocket';
import { getGowaBaseUrl } from '@/lib/api';
import { 
  getChats, 
  getChatMessages, 
  sendText, 
  sendImage, 
  sendDocument, 
  sendVideo,
  sendChatPresence
} from '@/lib/api';

// --- Interfaces ---

interface Chat {
  jid: string;
  name: string;
  unread_count?: number;
  last_message_time?: string;
  is_group?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
  is_pinned?: boolean;
  [key: string]: unknown;
}

interface Message {
  id: string;
  jid: string;
  message: string;
  from_me: boolean;
  timestamp: string;
  push_name?: string;
  status?: string; // sent, delivered, read
  type?: string;
  sender_jid?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'request' | 'response';
  message: string;
  data?: unknown;
}

// --- Helper Functions ---

const buildHistoryKey = (deviceId?: string | null, chatJid?: string) =>
  `gowa_chat_history_${deviceId || 'default'}_${chatJid || ''}`;

const buildUnreadKey = (deviceId?: string | null) =>
  `gowa_unread_${deviceId || 'default'}`;

type NormalizedItem = Record<string, unknown>;

const normalizeData = (data: unknown): NormalizedItem[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  if (typeof data !== 'object' || data === null) return [];

  const record = data as Record<string, unknown>;

  const candidates = [
    (record as { Results?: unknown }).Results,
    (record as { results?: { data?: unknown } }).results?.data,
    (record as { results?: unknown }).results,
    (record as { data?: unknown }).data,
    (record as { chats?: unknown }).chats,
    (record as { messages?: unknown }).messages,
    (record as { Data?: unknown }).Data,
    (record as { list?: unknown }).list
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if ((record as { data?: unknown }).data && typeof (record as { data?: unknown }).data === 'object') {
    return normalizeData((record as { data?: unknown }).data);
  }

  if ((record as { results?: unknown }).results && typeof (record as { results?: unknown }).results === 'object') {
    const results = (record as { results: unknown }).results as Record<string, unknown>;
    if (Array.isArray((results as { data?: unknown }).data)) return (results as { data: unknown[] }).data;
    return normalizeData(results);
  }

  return [];
};

const formatTime = (timestamp: string | number) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return format(date, 'HH:mm', { locale: idLocale });
  } catch (e) {
    return '';
  }
};

const formatDate = (timestamp: string | number) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return format(date, 'dd MMM yyyy', { locale: idLocale });
  } catch (e) {
    return '';
  }
};

// --- Main Component ---

export default function ChatExplorerPage() {
  const { devices, selectedDevice, setSelectedDevice } = useAuth();
  
  // Get current device JID for identifying sent messages
  const myJid = devices.find(d => d.id === selectedDevice)?.jid;
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const remoteTypingTimeoutRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { isConnected: wsConnected, events, connect, disconnect } = useWebSocket();
  const lastEventIdRef = useRef<string | null>(null);

  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Logging Helper ---
  const addLog = useCallback((type: LogEntry['type'], message: string, data?: unknown) => {
    setLogs(prev => [
      ...prev,
      { timestamp: new Date().toISOString(), type, message, data }
    ].slice(-50)); // Keep last 50 logs
  }, []);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const saveChatHistory = useCallback((deviceId: string | null, chatJid: string, msgs: Message[]) => {
    if (typeof window === 'undefined') return;
    try {
      const key = buildHistoryKey(deviceId, chatJid);
      localStorage.setItem(key, JSON.stringify(msgs.slice(-200)));
    } catch (error) {
      console.error('Failed to save chat history', error);
    }
  }, []);

  const loadChatHistory = useCallback((deviceId: string | null, chatJid: string): Message[] => {
    if (typeof window === 'undefined') return [];
    try {
      const key = buildHistoryKey(deviceId, chatJid);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (error) {
      console.error('Failed to load chat history', error);
      return [];
    }
  }, []);

  const getStoredUnreadMap = useCallback((deviceId: string | null): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    try {
      const key = buildUnreadKey(deviceId);
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, number>;
      }
      return {};
    } catch (error) {
      console.error('Failed to read unread map', error);
      return {};
    }
  }, []);

  const setStoredUnreadCount = useCallback((deviceId: string | null, chatJid: string, count: number) => {
    if (typeof window === 'undefined') return;
    try {
      const key = buildUnreadKey(deviceId);
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      if (count > 0) {
        map[chatJid] = count;
      } else {
        delete map[chatJid];
      }
      localStorage.setItem(key, JSON.stringify(map));
    } catch (error) {
      console.error('Failed to update unread count', error);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const anyWindow = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextCtor =
        anyWindow.AudioContext || anyWindow.webkitAudioContext;
      if (!AudioContextCtor) return;
      const audioCtx = new AudioContextCtor();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.05;
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 180);
    } catch (error) {
      console.error('Failed to play notification sound', error);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // --- Data Fetching ---

  const fetchChats = useCallback(async () => {
    if (!selectedDevice) return;

    setLoading(true);
    setError(null);
    addLog('request', 'Fetching chats...');

    try {
      // Assuming getChats supports limit/offset, adjust if needed
      const response = await getChats({ limit: 50, offset: 0 });
      addLog('response', 'Chats response received', response);

      const rawData = response.data;
      const normalizedChats = normalizeData(rawData);

      if (normalizedChats.length === 0) {
        addLog('info', 'No chats found or data format unrecognized', rawData);
        // Don't set error here, just empty list, but maybe warn if rawData wasn't empty
        if (rawData && Object.keys(rawData).length > 0 && !Array.isArray(rawData)) {
             // If rawData is not empty but we couldn't parse it, might be an issue
             console.warn('Could not normalize chat data:', JSON.stringify(rawData, null, 2));
        }
      } else {
        addLog('info', `Loaded ${normalizedChats.length} chats`);
      }

      const unreadMap = getStoredUnreadMap(selectedDevice || null);
      const enrichedChats = normalizedChats.map((chat: Chat) => {
        const stored = unreadMap[chat.jid];
        if (typeof stored === 'number') {
          return { ...chat, unread_count: stored };
        }
        return chat;
      });

      setChats(enrichedChats);
      setFilteredChats(enrichedChats);
    } catch (error) {
      const anyError = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        anyError.response?.data?.message || anyError.message || 'Failed to fetch chats';
      setError(msg);
      addLog('error', 'Fetch chats error', error);
      toast({
        title: 'Error fetching chats',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, addLog, toast, getStoredUnreadMap]);

  const fetchMessages = useCallback(async (chat: Chat) => {
    if (!chat || !chat.jid) return;

    setLoadingMessages(true);
    addLog('request', `Fetching messages for ${chat.jid}...`);
    
    try {
      const response = await getChatMessages(chat.jid, { limit: 50 });
      addLog('response', `Messages response for ${chat.jid}`, response);

      const rawData = response.data;
      const normalizedMessages = normalizeData(rawData);

      // Sort messages by timestamp (oldest first usually better for reading)
      // Assuming timestamp is ISO string or number
      normalizedMessages.sort((a, b) => {
        const tA = new Date(a.timestamp || 0).getTime();
        const tB = new Date(b.timestamp || 0).getTime();
        return tA - tB;
      });

      setMessages(normalizedMessages);
      saveChatHistory(selectedDevice || null, chat.jid, normalizedMessages);
      addLog('info', `Loaded ${normalizedMessages.length} messages`);
    } catch (error) {
      const anyError = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        anyError.response?.data?.message || anyError.message || 'Failed to fetch messages';
      addLog('error', 'Fetch messages error', error);
      toast({
        title: 'Error fetching messages',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  }, [addLog, toast, saveChatHistory, selectedDevice]);

  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      jid: selectedChat.jid,
      message: newMessage,
      from_me: true,
      timestamp: new Date().toISOString(),
      status: 'pending',
      type: 'text'
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      addLog('request', 'Sending message', { to: selectedChat.jid, message: tempMessage.message });
      const response = await sendText(selectedChat.jid, tempMessage.message);
      
      const data = response.data as {
        Results?: { message_id?: string; MessageID?: string };
        results?: { message_id?: string; MessageID?: string };
      };
      const resultData = data?.Results || data?.results;
      const realId = resultData?.message_id || resultData?.MessageID;

      // Update status to sent on success and replace ID if available
      setMessages(prev => prev.map(m => {
        if (m.id === tempId) {
          return { 
             ...m, 
             id: realId || m.id, 
             status: 'sent' 
          };
        }
        return m;
      }));
      
      if (!realId) {
         fetchMessages(selectedChat);
      }
      toast({ title: 'Sent', description: 'Message sent successfully' });
    } catch (error) {
      // Mark as failed
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      
      const anyError = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        anyError.response?.data?.message || anyError.message || 'Failed to send message';
      addLog('error', 'Send message error', error);
      console.error('Send message error:', error);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChat) return;

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    const formData = new FormData();
    formData.append('phone', selectedChat.jid);
    formData.append('file', file);
    formData.append('caption', newMessage || ''); // Optional caption

    let sendFunc = sendDocument;
    if (file.type.startsWith('image/')) sendFunc = sendImage;
    else if (file.type.startsWith('video/')) sendFunc = sendVideo;

    try {
      addLog('request', `Sending file: ${file.name} (${file.type})`);
      toast({ title: 'Sending...', description: `Uploading ${file.name}` });

      await sendFunc(formData);

      setNewMessage('');
      fetchMessages(selectedChat);
      toast({ title: 'Sent', description: 'File sent successfully' });
    } catch (error) {
      const anyError = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        anyError.response?.data?.message || anyError.message || 'Failed to send file';
      addLog('error', 'Send file error', error);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (!value.trim()) {
      setIsTyping(false);
      if (selectedChat) {
          sendChatPresence(selectedChat.jid, 'paused').catch(console.error);
      }
      return;
    }

    if (!isTyping && selectedChat) {
        setIsTyping(true);
        sendChatPresence(selectedChat.jid, 'composing').catch(console.error);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      if (selectedChat) {
          sendChatPresence(selectedChat.jid, 'paused').catch(console.error);
      }
      typingTimeoutRef.current = null;
    }, 3000); // 3 seconds timeout for typing status
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (remoteTypingTimeoutRef.current !== null) {
        window.clearTimeout(remoteTypingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedDevice) {
      disconnect();
      return;
    }

    const trimmedBaseUrl = getGowaBaseUrl();
    const path = `/ws?device_id=${encodeURIComponent(selectedDevice)}`;
    const wsUrl = trimmedBaseUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://') + path;

    connect(wsUrl);

    return () => {
      disconnect();
    };
  }, [selectedDevice, connect, disconnect]);

  const handleRealtimeEvent = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const data = raw as Record<string, unknown>;

    if (typeof data.code === 'string') {
      return;
    }

    const eventType = typeof data.event === 'string' ? data.event : undefined;

    if (eventType === 'presence') {
      const payload = (data.payload || {}) as {
        chat_id?: string;
        presence?: string;
        participant?: string;
      };

      if (selectedChat && payload.chat_id === selectedChat.jid) {
         // Only show typing if it's from the other person
         const isMe = payload.participant && myJid && payload.participant.includes(myJid.split('@')[0]);
         if (!isMe) {
             if (payload.presence === 'composing') {
                 setRemoteTyping(true);
                 if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
                 remoteTypingTimeoutRef.current = window.setTimeout(() => {
                     setRemoteTyping(false);
                 }, 3000);
             } else {
                 setRemoteTyping(false);
                 if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
             }
         }
      }
      return;
    }

    if (eventType === 'message') {
      const payload = (data.payload || {}) as {
        id?: string;
        chat_id?: string;
        body?: string;
        text?: string;
        from_name?: string;
        timestamp?: string;
        type?: string;
        from_me?: boolean;
      };
      const chatId: string | undefined = payload.chat_id;
      if (!chatId) return;

      const incomingMessage: Message = {
        id: payload.id || `${Date.now()}`,
        jid: chatId,
        message: payload.body || payload.text || '',
        from_me: payload.from_me || false,
        timestamp: payload.timestamp || new Date().toISOString(),
        push_name: payload.from_name,
        status: 'delivered',
        type: payload.type || 'text',
      };

      const deviceId = selectedDevice || null;

      setChats(prevChats =>
        prevChats.map(chat => {
          if (chat.jid !== chatId) return chat;
          const isActiveChat = selectedChat && selectedChat.jid === chatId;
          const nextUnread = isActiveChat ? 0 : (chat.unread_count || 0) + 1;
          setStoredUnreadCount(deviceId, chatId, nextUnread);
          return { ...chat, unread_count: nextUnread, last_message_time: incomingMessage.timestamp };
        })
      );

      if (selectedChat && selectedChat.jid === chatId) {
        setMessages(prev => {
          // Deduplication logic
          if (prev.some(m => m.id === incomingMessage.id)) return prev;

          // If message is from me, check if we have a pending message with same content
          if (incomingMessage.from_me) {
              const pendingMatchIndex = prev.findIndex(m => 
                  m.status === 'pending' && 
                  m.message === incomingMessage.message &&
                  (new Date().getTime() - new Date(m.timestamp).getTime() < 10000) // created within last 10s
              );
              
              if (pendingMatchIndex !== -1) {
                  // Update the pending message instead of adding new
                  const newMessages = [...prev];
                  newMessages[pendingMatchIndex] = {
                      ...newMessages[pendingMatchIndex],
                      id: incomingMessage.id,
                      status: 'sent'
                  };
                  saveChatHistory(deviceId, chatId, newMessages);
                  return newMessages;
              }
          }

          const next = [...prev, incomingMessage];
          saveChatHistory(deviceId, chatId, next);
          return next;
        });
        scrollToBottom();
      } else {
        playNotificationSound();
      }

      return;
    }

    if (eventType === 'message.ack') {
      const payload = (data.payload || {}) as {
        ids?: string[];
        receipt_type_description?: string;
        receipt_type?: string;
      };
      const ids: string[] = payload.ids || [];
      if (!ids.length) return;

      const description = String(
        payload.receipt_type_description || payload.receipt_type || ''
      ).toLowerCase();

      let status = 'sent';
      if (description.includes('read')) status = 'read';
      else if (description.includes('deliver')) status = 'delivered';

      setMessages(prev =>
        prev.map(m => (ids.includes(m.id) ? { ...m, status } : m))
      );
    }
  }, [selectedChat, selectedDevice, myJid, saveChatHistory, scrollToBottom, playNotificationSound, setStoredUnreadCount, setChats]);

  useEffect(() => {
    if (!events.length) return;
    const latest = events[0];
    if (!latest || latest.id === lastEventIdRef.current) return;
    lastEventIdRef.current = latest.id;
    handleRealtimeEvent(latest.data);
  }, [events, handleRealtimeEvent]);

  const handleChatSelect = useCallback((chat: Chat) => {
    setSelectedChat(chat);
    const deviceId = selectedDevice || null;
    const cached = loadChatHistory(deviceId, chat.jid);
    if (cached.length > 0) {
      setMessages(cached);
    } else {
      setMessages([]);
    }

    setChats(prev =>
      prev.map(c =>
        c.jid === chat.jid ? { ...c, unread_count: 0 } : c
      )
    );
    setStoredUnreadCount(deviceId, chat.jid, 0);

    fetchMessages(chat);
  }, [selectedDevice, loadChatHistory, fetchMessages, setStoredUnreadCount]);

  useEffect(() => {
    if (selectedDevice) {
      fetchChats();
      setSelectedChat(null);
      setMessages([]);
    } else {
      setChats([]);
      setFilteredChats([]);
    }
  }, [selectedDevice, fetchChats]);

  useEffect(() => {
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      setFilteredChats(chats.filter(c => 
        (c.name && c.name.toLowerCase().includes(lower)) ||
        (c.jid && c.jid.includes(lower)) ||
        (c.push_name && c.push_name.toLowerCase().includes(lower))
      ));
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  // --- Render Helpers ---

  const renderMessageStatus = (status?: string) => {
    if (!status) return null;
    switch (status.toLowerCase()) {
      case 'read': return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'delivered': return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'sent': return <Check className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <DeviceSelector
            value={selectedDevice}
            onChange={setSelectedDevice}
            className="w-[250px]"
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchChats} 
            disabled={loading || !selectedDevice}
            title="Refresh Chats"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Debug Logs Toggle or Summary could go here */}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" onClick={fetchChats} className="ml-4">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Left Pane: Chat List */}
        <Card className={`w-full md:w-1/3 flex flex-col min-w-[300px] ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
          <CardHeader className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading chats...
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
                <p>No chats found.</p>
                {!selectedDevice && <p className="text-xs">Select a device to start.</p>}
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="flex flex-col divide-y">
                  {filteredChats.map((chat) => (
                    <button
                      key={chat.jid}
                      onClick={() => {
                        setSelectedChat(chat);
                        fetchMessages(chat);
                      }}
                      className={`flex items-start gap-3 p-4 hover:bg-accent transition-colors text-left ${
                        selectedChat?.jid === chat.jid ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {chat.is_group ? (
                            <span className="font-semibold text-primary">G</span>
                        ) : (
                            <span className="font-semibold text-primary">
                                {chat.name?.charAt(0) || chat.jid?.charAt(0) || '?'}
                            </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-medium truncate block max-w-[140px]">
                            {chat.name || chat.push_name || chat.jid}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(chat.last_message_time)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate flex justify-between">
                            <span>{chat.jid}</span>
                            {chat.unread_count && chat.unread_count > 0 ? (
                                <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1 flex items-center justify-center">
                                    {chat.unread_count}
                                </Badge>
                            ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Right Pane: Message List */}
        <Card className={`flex-1 flex-col min-w-0 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedChat ? (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden -ml-2 shrink-0" 
                    onClick={() => setSelectedChat(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="font-semibold text-primary">
                      {selectedChat.name?.charAt(0) || selectedChat.jid?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">
                      {selectedChat.name || selectedChat.push_name || selectedChat.jid}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                        {remoteTyping ? (
                            <span className="text-green-500 font-medium animate-pulse">Typing...</span>
                        ) : (
                            selectedChat.jid
                        )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" title="Refresh Messages" onClick={() => fetchMessages(selectedChat)}>
                    <RefreshCw className={`h-4 w-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Contact</DropdownMenuItem>
                      <DropdownMenuItem>Clear Chat</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Block</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50 dark:bg-slate-900/50 relative">
                 {/* Messages Area */}
                <ScrollArea className="h-full p-4">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                       <MessageSquare className="h-12 w-12 mb-2" />
                       <p>No messages yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 pb-4">
                      {messages.map((msg, idx) => {
                          const isMe = msg.from_me || (
                              myJid && msg.sender_jid && msg.sender_jid.replace(/:\d+@/, '@') === myJid.replace(/:\d+@/, '@')
                          ) || (
                              selectedChat && 
                              !selectedChat.jid.includes('@g.us') && 
                              msg.sender_jid && 
                              msg.sender_jid.replace(/:\d+@/, '@') !== selectedChat.jid.replace(/:\d+@/, '@')
                          );
                          // Check if date changed from previous message
                          const prevMsg = messages[idx - 1];
                          const showDate = !prevMsg || 
                             formatDate(msg.timestamp) !== formatDate(prevMsg.timestamp);

                          return (
                            <React.Fragment key={msg.id || idx}>
                                {showDate && (
                                    <div className="flex justify-center my-4">
                                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                            {formatDate(msg.timestamp)}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                                    isMe
                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                        : 'bg-white dark:bg-slate-800 rounded-tl-none border'
                                    }`}
                                >
                                    {!isMe && msg.push_name && (
                                        <p className="text-xs font-semibold mb-1 opacity-70">{msg.push_name}</p>
                                    )}
                                    
                                    {/* Message Content Handling */}
                                    {msg.type === 'image' ? (
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4" />
                                            <span>Photo</span>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap break-words text-sm">{msg.message || msg.content || msg.text || '<No content>'}</p>
                                    )}

                                    <div className={`flex items-center gap-1 justify-end mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    <span className="text-[10px]">
                                        {formatTime(msg.timestamp)}
                                    </span>
                                    {isMe && renderMessageStatus(msg.status)}
                                    </div>
                                </div>
                                </div>
                            </React.Fragment>
                          );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Input Area */}
              <div className="p-4 border-t bg-background">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" title="Attachments">
                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={triggerFileUpload}>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            <span>Photos & Videos</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={triggerFileUpload}>
                            <FileIcon className="mr-2 h-4 w-4" />
                            <span>Document</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Input 
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!newMessage.trim()}>
                          Send
                      </Button>
                  </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="bg-muted/50 p-6 rounded-full mb-4">
                <MessageSquare className="h-12 w-12 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2">Select a chat to start messaging</h3>
              <p className="text-sm text-center max-w-xs">
                Choose a conversation from the left sidebar to view messages and reply.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Debug Logs Section (Collapsible) */}
      <div className="border-t pt-2">
          <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Debug Logs ({logs.length})</summary>
              <div className="mt-2 h-32 overflow-y-auto bg-slate-950 text-slate-50 p-2 rounded font-mono text-[10px]">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-white/10 pb-1">
                        <span className="text-blue-400">[{formatTime(log.timestamp)}]</span>{' '}
                        <span className={
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'request' ? 'text-yellow-400' :
                            log.type === 'response' ? 'text-green-400' : 'text-gray-400'
                        }>{log.type.toUpperCase()}:</span>{' '}
                        {log.message}
                        {log.data && (
                            <pre className="mt-1 text-gray-500 overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
                <div ref={logsEndRef} />
              </div>
          </details>
      </div>
    </div>
  );
}
