import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Activity, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket, WebhookEvent } from '@/hooks/use-websocket';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { getGowaBaseUrl, sendText } from '@/lib/api';
import dbData from '../../db/database.json';

interface AutoReplyRule {
  id: string;
  pesan: string;
  balasan: string;
  created_at: string;
  updated_at: string;
}

interface AutoReplySettings {
  autoConnect?: boolean;
  enabled?: boolean;
}

interface DatabaseFile {
  auto_reply_rules?: AutoReplyRule[];
  auto_reply_settings?: AutoReplySettings;
}

type HistoryAction = 'create' | 'update' | 'delete' | 'import' | 'match' | 'no_match' | 'error';

interface HistoryEntry {
  id: string;
  ruleId?: string;
  action: HistoryAction;
  timestamp: string;
  detail?: string;
}

type ActivityStatus = 'matched' | 'no_match' | 'error';

interface ActivityEntry {
  id: string;
  timestamp: string;
  eventType: string;
  incomingText?: string;
  matchedRule?: string;
  replyText?: string;
  phone?: string;
  status: ActivityStatus;
  error?: string;
}

const RULES_STORAGE_KEY = 'auto_reply_rules';
const HISTORY_STORAGE_KEY = 'auto_reply_history';
const SETTINGS_STORAGE_KEY = 'auto_reply_settings';

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Failed to save auto reply data to storage');
  }
}

export default function AutoReplyPage() {
  const { toast } = useToast();
  const { selectedDevice } = useAuth();
  const { isConnected, events, connect, disconnect } = useWebSocket();

  const [rules, setRules] = useState<AutoReplyRule[]>(() => {
    const stored = loadFromStorage<AutoReplyRule[]>(RULES_STORAGE_KEY, []);
    if (stored.length) return stored;

    const database = dbData as DatabaseFile;
    if (Array.isArray(database.auto_reply_rules)) {
      return database.auto_reply_rules;
    }

    return [];
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    loadFromStorage<HistoryEntry[]>(HISTORY_STORAGE_KEY, [])
  );
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(() => {
    const stored = loadFromStorage<AutoReplySettings | null>(SETTINGS_STORAGE_KEY, null);
    if (stored && typeof stored.enabled === 'boolean') {
      return stored.enabled;
    }
    const database = dbData as DatabaseFile;
    if (
      database.auto_reply_settings &&
      typeof database.auto_reply_settings.enabled === 'boolean'
    ) {
      return database.auto_reply_settings.enabled;
    }
    return true;
  });
  const [form, setForm] = useState<{ id?: string; pesan: string; balasan: string }>({
    pesan: '',
    balasan: '',
  });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    const value: AutoReplySettings = { enabled: autoReplyEnabled };
    saveToStorage(SETTINGS_STORAGE_KEY, value);
  }, [autoReplyEnabled]);

  useEffect(() => {
    if (!rules.length) {
      const database = dbData as DatabaseFile;
      if (Array.isArray(database.auto_reply_rules) && database.auto_reply_rules.length) {
        setRules(database.auto_reply_rules);
      }
    }
  }, [rules]);

  useEffect(() => {
    saveToStorage(RULES_STORAGE_KEY, rules);
  }, [rules]);

  useEffect(() => {
    saveToStorage(HISTORY_STORAGE_KEY, history);
  }, [history]);

  const ruleIndex = useMemo(() => {
    const map = new Map<string, AutoReplyRule>();
    for (const rule of rules) {
      const key = normalizeText(rule.pesan);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, rule);
      }
    }
    return map;
  }, [rules]);

  const addHistory = useCallback((entry: Omit<HistoryEntry, 'id'>) => {
    const full: HistoryEntry = { ...entry, id: generateId() };
    setHistory(prev => [full, ...prev].slice(0, 300));
  }, []);

  const addActivity = useCallback((entry: Omit<ActivityEntry, 'id'>) => {
    const full: ActivityEntry = { ...entry, id: generateId() };
    setActivity(prev => [full, ...prev].slice(0, 200));
  }, []);

  const handleFormSubmit = () => {
    const pesan = form.pesan.trim();
    const balasan = form.balasan.trim();
    if (!pesan || !balasan) {
      toast({ title: 'Pesan dan balasan wajib diisi', variant: 'destructive' });
      return;
    }

    const now = new Date().toISOString();

    if (form.id) {
      setRules(prev =>
        prev.map(rule =>
          rule.id === form.id
            ? {
                ...rule,
                pesan,
                balasan,
                updated_at: now,
              }
            : rule
        )
      );
      addHistory({
        action: 'update',
        ruleId: form.id,
        timestamp: now,
        detail: `Update rule untuk "${pesan}"`,
      });
      toast({ title: 'Auto reply diupdate' });
    } else {
      const newRule: AutoReplyRule = {
        id: generateId(),
        pesan,
        balasan,
        created_at: now,
        updated_at: now,
      };
      setRules(prev => [...prev, newRule]);
      addHistory({
        action: 'create',
        ruleId: newRule.id,
        timestamp: now,
        detail: `Tambah rule untuk "${pesan}"`,
      });
      toast({ title: 'Auto reply ditambahkan' });
    }

    setForm({ id: undefined, pesan: '', balasan: '' });
  };

  const handleEdit = (rule: AutoReplyRule) => {
    setForm({
      id: rule.id,
      pesan: rule.pesan,
      balasan: rule.balasan,
    });
  };

  const handleDelete = (rule: AutoReplyRule) => {
    setRules(prev => prev.filter(r => r.id !== rule.id));
    const now = new Date().toISOString();
    addHistory({
      action: 'delete',
      ruleId: rule.id,
      timestamp: now,
      detail: `Hapus rule untuk "${rule.pesan}"`,
    });
    toast({ title: 'Auto reply dihapus' });
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const parseCsv = (content: string): AutoReplyRule[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return [];

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const pesanIndex = header.indexOf('pesan');
    const balasanIndex = header.indexOf('balasan');
    const createdIndex = header.indexOf('created_at');
    const updatedIndex = header.indexOf('updated_at');

    const now = new Date().toISOString();
    const results: AutoReplyRule[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const pesan = row[pesanIndex]?.trim() || '';
      const balasan = row[balasanIndex]?.trim() || '';
      if (!pesan || !balasan) continue;

      const createdRaw = createdIndex >= 0 ? row[createdIndex]?.trim() : '';
      const updatedRaw = updatedIndex >= 0 ? row[updatedIndex]?.trim() : '';

      const created_at = createdRaw || now;
      const updated_at = updatedRaw || created_at;

      results.push({
        id: generateId(),
        pesan,
        balasan,
        created_at,
        updated_at,
      });
    }

    return results;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = String(reader.result || '');
        const importedRules = parseCsv(content);
        if (!importedRules.length) {
          toast({
            title: 'Import gagal',
            description: 'Tidak ada data valid di file CSV',
            variant: 'destructive',
          });
        } else {
          const now = new Date().toISOString();
          setRules(prev => [...prev, ...importedRules]);
          addHistory({
            action: 'import',
            timestamp: now,
            detail: `Import ${importedRules.length} rule dari CSV`,
          });
          toast({ title: 'Import berhasil', description: `Berhasil import ${importedRules.length} rule` });
        }
      } catch {
        toast({
          title: 'Import gagal',
          description: 'File CSV tidak valid',
          variant: 'destructive',
        });
      } finally {
        setImporting(false);
      }
    };
    reader.onerror = () => {
      setImporting(false);
      toast({
        title: 'Import gagal',
        description: 'Tidak bisa membaca file CSV',
        variant: 'destructive',
      });
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (!rules.length) {
      toast({ title: 'Tidak ada data untuk diexport', variant: 'destructive' });
      return;
    }

    const header = ['pesan', 'balasan', 'created_at', 'updated_at'];
    const rows = rules.map(rule =>
      [
        rule.pesan.replace(/"/g, '""'),
        rule.balasan.replace(/"/g, '""'),
        rule.created_at,
        rule.updated_at,
      ].map(value => `"${value}"`).join(',')
    );

    const csvContent = [header.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'auto_reply_rules.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export berhasil' });
  };

  const handleManualWebhookTest = () => {
    const phoneRaw = testPhone.trim();
    const messageRaw = testMessage.trim();
    if (!phoneRaw || !messageRaw) {
      toast({
        title: 'Nomor dan pesan wajib diisi untuk tes webhook',
        variant: 'destructive',
      });
      return;
    }

    const chatId = phoneRaw.includes('@') ? phoneRaw : `${phoneRaw}@s.whatsapp.net`;

    const data = {
      event: 'message',
      payload: {
        id: `manual-${Date.now()}`,
        chat_id: chatId,
        body: messageRaw,
        text: messageRaw,
        from_me: false,
      },
    };

    const event: WebhookEvent = {
      id: generateId(),
      type: 'message',
      timestamp: new Date(),
      data,
    };

    processWebhookEvent(event);
    toast({
      title: 'Tes webhook dikirim',
      description: 'Cek aktivitas auto reply di bagian bawah.',
    });
  };

  const buildWsUrl = useCallback(() => {
    const base = getGowaBaseUrl();
    const path = selectedDevice
      ? `/ws?device_id=${encodeURIComponent(selectedDevice)}`
      : '/ws';
    return base.replace('https://', 'wss://').replace('http://', 'ws://') + path;
  }, [selectedDevice]);

  const handleConnect = useCallback(() => {
    if (!selectedDevice) {
      return;
    }
    const wsUrl = buildWsUrl();
    connect(wsUrl);
  }, [buildWsUrl, connect, selectedDevice]);

  useEffect(() => {
    if (!autoReplyEnabled) return;
    if (!selectedDevice) return;
    if (isConnected) return;
    handleConnect();
  }, [autoReplyEnabled, selectedDevice, isConnected, handleConnect]);

  useEffect(() => {
    if (!autoReplyEnabled && isConnected) {
      disconnect();
    }
  }, [autoReplyEnabled, isConnected, disconnect]);

  const processWebhookEvent = useCallback(
    (event: WebhookEvent) => {
      const raw = event.data as unknown;
      if (!raw || typeof raw !== 'object') return;

      const data = raw as Record<string, unknown>;
      const eventTypeValue =
        typeof data.event === 'string'
          ? data.event
          : typeof data.type === 'string'
          ? data.type
          : '';
      const eventType = eventTypeValue.toLowerCase();
      if (eventType !== 'message') return;

      const base =
        'payload' in data
          ? (data as { payload?: unknown }).payload
          : undefined;

      const payload = (base || {}) as {
        id?: string;
        chat_id?: string;
        body?: string;
        text?: string;
        from_me?: boolean;
      };

      const messageId = typeof payload.id === 'string' ? payload.id : undefined;
      if (messageId && processedMessageIdsRef.current.has(messageId)) return;

      const fromMe = Boolean(payload.from_me);
      if (fromMe) return;

      const originalText = String(payload.body || payload.text || '').trim();
      if (!originalText) return;

      const chatId = typeof payload.chat_id === 'string' ? payload.chat_id : '';
      let phone: string | undefined;
      if (chatId && chatId.includes('@')) {
        phone = chatId.split('@')[0];
      }

      const normalized = normalizeText(originalText);
      if (!normalized) return;

      const matchedRule = ruleIndex.get(normalized);
      const baseTimestamp = new Date().toISOString();

      if (!matchedRule) {
        if (messageId) {
          processedMessageIdsRef.current.add(messageId);
        }
        addActivity({
          timestamp: baseTimestamp,
          eventType,
          incomingText: originalText,
          status: 'no_match',
        });
        addHistory({
          action: 'no_match',
          timestamp: baseTimestamp,
          detail: `Tidak ada match untuk "${normalized}"`,
        });
        return;
      }

      window.setTimeout(async () => {
        const sendTimestamp = new Date().toISOString();
        try {
          if (messageId) {
            processedMessageIdsRef.current.add(messageId);
          }

          if (phone) {
            await sendText(phone, matchedRule.balasan);
          }

          addActivity({
            timestamp: sendTimestamp,
            eventType,
            incomingText: originalText,
            matchedRule: matchedRule.pesan,
            replyText: matchedRule.balasan,
            phone,
            status: 'matched',
          });
          addHistory({
            action: 'match',
            ruleId: matchedRule.id,
            timestamp: sendTimestamp,
            detail: `Auto reply terkirim untuk "${matchedRule.pesan}"`,
          });
        } catch {
          addActivity({
            timestamp: sendTimestamp,
            eventType,
            incomingText: originalText,
            matchedRule: matchedRule.pesan,
            replyText: matchedRule.balasan,
            phone,
            status: 'error',
            error: 'Gagal mengirim auto reply',
          });
          addHistory({
            action: 'error',
            ruleId: matchedRule.id,
            timestamp: sendTimestamp,
            detail: 'Gagal mengirim auto reply',
          });
          toast({
            title: 'Error auto reply',
            description: 'Gagal mengirim balasan otomatis',
            variant: 'destructive',
          });
        }
      }, 1000);
    },
    [addActivity, addHistory, ruleIndex, toast]
  );

  useEffect(() => {
    if (!events.length) return;
    const latest = events[0];
    if (!latest || latest.id === lastEventIdRef.current) return;
    lastEventIdRef.current = latest.id;
    processWebhookEvent(latest);
  }, [events, processWebhookEvent]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Auto Reply</h1>
          <p className="text-muted-foreground">
            Kelola rule auto reply dan proses pesan masuk dari webhook.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Device & Webhook
          </CardTitle>
          <CardDescription>
            Device diambil dari header. Auto reply berjalan jika status aktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Device aktif</div>
              <div className="text-sm font-medium">
                {selectedDevice || 'Belum ada device terpilih'}
              </div>
            </div>
            <Badge variant={isConnected ? 'default' : 'outline'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="auto-reply-enabled"
              checked={autoReplyEnabled}
              onCheckedChange={value => setAutoReplyEnabled(Boolean(value))}
            />
            <Label htmlFor="auto-reply-enabled">Auto reply aktif</Label>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="test-phone">Tes webhook manual</Label>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                id="test-phone"
                placeholder="contoh: 6282392115909"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
              />
              <Input
                id="test-message"
                placeholder="Pesan masuk untuk dites"
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
              />
              <Button onClick={handleManualWebhookTest}>
                Tes kirim
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aturan Auto Reply</CardTitle>
          <CardDescription>
            Simpan rule auto reply dalam format JSON dengan import/export CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pesan">Pesan (trigger)</Label>
                <Input
                  id="pesan"
                  placeholder="contoh: halo"
                  value={form.pesan}
                  onChange={e => setForm(prev => ({ ...prev, pesan: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balasan">Balasan</Label>
                <Input
                  id="balasan"
                  placeholder="contoh: halo, ada yang bisa kami bantu?"
                  value={form.balasan}
                  onChange={e => setForm(prev => ({ ...prev, balasan: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleFormSubmit}>
                  <Plus className="w-4 h-4 mr-1" />
                  {form.id ? 'Update Rule' : 'Tambah Rule'}
                </Button>
                {form.id && (
                  <Button
                    variant="outline"
                    onClick={() => setForm({ id: undefined, pesan: '', balasan: '' })}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Import / Export CSV</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing}>
                  {importing ? 'Importing...' : 'Import CSV'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export CSV
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Format kolom: pesan, balasan, created_at, updated_at. Baris pertama sebagai header.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Daftar Rule</h2>
              <span className="text-xs text-muted-foreground">
                Total: {rules.length}
              </span>
            </div>
            {rules.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada rule. Tambahkan rule auto reply di form sebelah kiri.
              </p>
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-2">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className="flex items-start justify-between gap-3 p-3 border rounded-md bg-muted/40"
                    >
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Trigger
                        </div>
                        <div className="text-sm font-medium break-all">
                          {rule.pesan}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Balasan: {rule.balasan}
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>Created: {rule.created_at}</span>
                          <span>Updated: {rule.updated_at}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDelete(rule)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas & Histori</CardTitle>
          <CardDescription>
            Pantau log auto reply dan histori perubahan rule berdasarkan waktu.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Aktivitas Auto Reply</h3>
              <span className="text-xs text-muted-foreground">
                Terbaru: {activity.length}
              </span>
            </div>
            {activity.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada aktivitas auto reply.
              </p>
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-2">
                  {activity.map(entry => (
                    <div
                      key={entry.id}
                      className="p-3 border rounded-md bg-muted/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px]">
                          {entry.timestamp}
                        </span>
                        <Badge
                          variant={
                            entry.status === 'matched'
                              ? 'default'
                              : entry.status === 'no_match'
                              ? 'outline'
                              : 'destructive'
                          }
                        >
                          {entry.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Event: {entry.eventType}
                        {entry.phone && ` • ${entry.phone}`}
                      </div>
                      {entry.incomingText && (
                        <div>
                          <span className="font-semibold">Pesan:</span>{' '}
                          {entry.incomingText}
                        </div>
                      )}
                      {entry.matchedRule && (
                        <div>
                          <span className="font-semibold">Rule:</span>{' '}
                          {entry.matchedRule}
                        </div>
                      )}
                      {entry.replyText && (
                        <div>
                          <span className="font-semibold">Balasan:</span>{' '}
                          {entry.replyText}
                        </div>
                      )}
                      {entry.error && (
                        <div className="text-destructive">
                          Error: {entry.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Histori Perubahan</h3>
              <span className="text-xs text-muted-foreground">
                Total: {history.length}
              </span>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada histori perubahan rule.
              </p>
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-2">
                  {history.map(entry => (
                    <div
                      key={entry.id}
                      className="p-3 border rounded-md bg-muted/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px]">
                          {entry.timestamp}
                        </span>
                        <Badge variant="outline">{entry.action}</Badge>
                      </div>
                      {entry.detail && <div>{entry.detail}</div>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
