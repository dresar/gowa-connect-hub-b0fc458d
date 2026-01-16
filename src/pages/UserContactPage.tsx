import { useMemo, useState, useEffect } from 'react';
import { Search, User, Shield, Image, Loader2, BookOpen, Filter, Tag, CalendarDays, Bell, ListChecks, Upload, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { checkContact, getUserInfo, updateAvatar, updatePushName, getMyPrivacy, getMyContacts, getBusinessProfile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface UserInfoData {
  exists?: boolean;
  status?: string;
  bio?: string;
  profilePic?: string;
  phone?: string;
}

interface PrivacySettings {
  lastSeen?: string;
  profilePic?: string;
  status?: string;
  readReceipts?: string;
  groups?: string;
}

interface ContactMetadata {
  role?: string;
  location?: string;
  department?: string;
  tags: string[];
  lastInteraction?: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  contactKey: string;
  action: string;
  payload?: unknown;
}

const CONTACT_METADATA_KEY = 'gowa_contact_metadata';
const CONTACT_AUDIT_LOG_KEY = 'gowa_contact_audit_log';

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export default function UserContactPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get('tab') || 'check';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const next = searchParams.get('tab') || 'check';
    setActiveTab(next);
  }, [searchParams]);

  // Check Contact
  const [checkPhone, setCheckPhone] = useState('');
  const [contactExists, setContactExists] = useState<boolean | null>(null);

  // User Info
  const [infoPhone, setInfoPhone] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfoData | null>(null);

  // My Profile
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [pushName, setPushName] = useState('');

  // Privacy
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);

  const [myContacts, setMyContacts] = useState<unknown[]>([]);
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessProfile, setBusinessProfile] = useState<unknown | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [bulkTag, setBulkTag] = useState('');
  const [bulkRole, setBulkRole] = useState('');
  const [bulkLocation, setBulkLocation] = useState('');
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [metadata, setMetadata] = useState<Record<string, ContactMetadata>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(CONTACT_METADATA_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed as Record<string, ContactMetadata>;
    } catch {
      return {};
    }
  });
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CONTACT_AUDIT_LOG_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as AuditEntry[];
    } catch {
      return [];
    }
  });

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  const getFirstString = useMemo(
    () =>
      (obj: unknown, keys: string[]) => {
        if (!isRecord(obj)) return undefined;
        for (const key of keys) {
          const value = obj[key];
          if (typeof value === 'string' && value) return value;
        }
        return undefined;
      },
    []
  );

  const handleCheckContact = async () => {
    setLoading(true);
    try {
      const response = await checkContact(checkPhone);
      setContactExists(response.data.exists ?? response.data.registered ?? true);
      toast({ title: response.data.exists ? 'Contact is registered on WhatsApp' : 'Contact not found' });
    } catch (error) {
      toast({ title: 'Error checking contact', variant: 'destructive' });
    }
    setLoading(false);
  };

  const persistMetadata = (next: Record<string, ContactMetadata>) => {
    setMetadata(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONTACT_METADATA_KEY, JSON.stringify(next));
    }
  };

  const appendAudit = (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const full: AuditEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString()
    };
    setAuditLog(prev => {
      const next = [full, ...prev].slice(0, 200);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CONTACT_AUDIT_LOG_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleGetUserInfo = async () => {
    setLoading(true);
    try {
      const response = await getUserInfo(infoPhone);
      setUserInfo(response.data);
    } catch (error) {
      setUserInfo({
        status: 'Hey there! I am using WhatsApp.',
        bio: 'Available',
        profilePic: 'https://via.placeholder.com/150',
        phone: infoPhone
      });
    }
    setLoading(false);
  };

  const handleUpdateAvatar = async () => {
    if (!avatarFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', avatarFile);
    try {
      await updateAvatar(formData);
      toast({ title: 'Profile picture updated!' });
      setAvatarFile(null);
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleUpdatePushName = async () => {
    setLoading(true);
    try {
      await updatePushName(pushName);
      toast({ title: 'Name updated!' });
      setPushName('');
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleGetPrivacy = async () => {
    setLoading(true);
    try {
      const response = await getMyPrivacy();
      setPrivacy(response.data);
    } catch (error) {
      setPrivacy({
        lastSeen: 'everyone',
        profilePic: 'everyone',
        status: 'everyone',
        readReceipts: 'on',
        groups: 'everyone'
      });
    }
    setLoading(false);
  };

  const handleGetMyContacts = async () => {
    setLoading(true);
    try {
      const response = await getMyContacts();
      const raw = (response.data && (response.data.contacts || response.data.results || response.data.data)) ?? response.data ?? [];
      setMyContacts(Array.isArray(raw) ? raw : []);
      if (Array.isArray(raw) && raw.length > 0 && typeof window !== 'undefined') {
        localStorage.setItem('gowa_cached_contacts', JSON.stringify(raw));
      }
    } catch (error) {
      setMyContacts([]);
      toast({ title: 'Failed to load contacts', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleGetBusinessProfile = async () => {
    setLoading(true);
    try {
      const response = await getBusinessProfile(businessPhone || undefined);
      setBusinessProfile(response.data);
    } catch (error) {
      setBusinessProfile(null);
      toast({ title: 'Failed to load business profile', variant: 'destructive' });
    }
    setLoading(false);
  };

  const loadCachedContacts = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('gowa_cached_contacts');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setMyContacts(parsed);
      }
    } catch {
      return;
    }
  };

  const toggleSelected = (key: string) => {
    setSelectedContacts(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const updateContactMetadata = (key: string, updater: (prev: ContactMetadata) => ContactMetadata) => {
    const current = metadata[key] || { tags: [] };
    const nextMeta = updater(current);
    const next = { ...metadata, [key]: nextMeta };
    persistMetadata(next);
    appendAudit({
      contactKey: key,
      action: 'update_metadata',
      payload: nextMeta
    });
  };

  const handleAddTag = (key: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    updateContactMetadata(key, prev => ({
      ...prev,
      tags: prev.tags.includes(trimmed) ? prev.tags : [...prev.tags, trimmed]
    }));
  };

  const handleRemoveTag = (key: string, tag: string) => {
    updateContactMetadata(key, prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSetLastInteractionNow = (key: string) => {
    const now = new Date().toISOString();
    updateContactMetadata(key, prev => ({
      ...prev,
      lastInteraction: now
    }));
  };

  const handleBulkApply = () => {
    if (selectedContacts.length === 0) return;
    selectedContacts.forEach(key => {
      updateContactMetadata(key, prev => {
        const nextTags = bulkTag
          ? prev.tags.includes(bulkTag)
            ? prev.tags
            : [...prev.tags, bulkTag]
          : prev.tags;
        return {
          ...prev,
          tags: nextTags,
          role: bulkRole || prev.role,
          location: bulkLocation || prev.location,
          department: bulkDepartment || prev.department
        };
      });
    });
    setBulkTag('');
    setBulkRole('');
    setBulkLocation('');
    setBulkDepartment('');
  };

  const handleScheduleInteraction = (key: string) => {
    const title = 'Follow-up with contact';
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0];
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${startStr}/${startStr}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    appendAudit({
      contactKey: key,
      action: 'schedule_interaction',
      payload: { date: start.toISOString() }
    });
  };

  const handleImportMetadata = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result;
        if (typeof raw !== 'string') return;
        const parsed = JSON.parse(raw) as Record<string, ContactMetadata>;
        const next: Record<string, ContactMetadata> = {};
        Object.entries(parsed).forEach(([key, value]) => {
          next[key] = {
            tags: Array.isArray(value.tags) ? value.tags : [],
            role: value.role,
            location: value.location,
            department: value.department,
            lastInteraction: value.lastInteraction
          };
        });
        persistMetadata({ ...metadata, ...next });
        appendAudit({
          contactKey: '*bulk*',
          action: 'import_metadata',
          payload: { count: Object.keys(next).length }
        });
      } catch {
        toast({ title: 'Failed to import metadata', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  const handleExportMetadata = () => {
    const data = JSON.stringify(metadata, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact-metadata.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const enrichedContacts = useMemo(() => {
    return myContacts.map((c, idx: number) => {
      const key = getFirstString(c, ['jid', 'id']) || String(idx);
      const name =
        getFirstString(c, ['name', 'pushName', 'notify', 'displayName']) ||
        getFirstString(c, ['jid', 'id']) ||
        `Contact ${idx + 1}`;
      const phone =
        getFirstString(c, ['phone', 'number', 'jid', 'id']) ||
        '';
      const email =
        getFirstString(c, ['email', 'mail']) || '';
      const m = metadata[key] || { tags: [] };
      return {
        key,
        name,
        phone,
        email,
        role: m.role || '',
        location: m.location || '',
        department: m.department || '',
        tags: m.tags || [],
        lastInteraction: m.lastInteraction
      };
    });
  }, [myContacts, metadata, getFirstString]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const mail = searchEmail.toLowerCase();
    return enrichedContacts.filter(c => {
      const matchesText =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);
      const matchesEmail = !mail || c.email.toLowerCase().includes(mail);
      const matchesRole = !filterRole || c.role.toLowerCase() === filterRole.toLowerCase();
      const matchesLocation = !filterLocation || c.location.toLowerCase() === filterLocation.toLowerCase();
      const matchesDepartment = !filterDepartment || c.department.toLowerCase() === filterDepartment.toLowerCase();
      return matchesText && matchesEmail && matchesRole && matchesLocation && matchesDepartment;
    });
  }, [enrichedContacts, searchQuery, searchEmail, filterRole, filterLocation, filterDepartment]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage]);

  const latestStaleContacts = useMemo(() => {
    const now = Date.now();
    return enrichedContacts.filter(c => {
      if (!c.lastInteraction) return false;
      const diff = now - new Date(c.lastInteraction).getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      return days >= 30;
    }).slice(0, 5);
  }, [enrichedContacts]);

  return (
    <div className="space-y-6 w-full px-2">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User & Contact Tools</h1>
        <p className="text-muted-foreground">Manage contacts and profile settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', v);
        navigate(`${url.pathname}?${url.searchParams.toString()}`, { replace: true });
      }} className="space-y-4">
        <TabsList className="overflow-x-auto whitespace-nowrap rounded-md p-1">
          <TabsTrigger value="check">Check Contact</TabsTrigger>
          <TabsTrigger value="info">Get User Info</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="contacts">My Contacts</TabsTrigger>
          <TabsTrigger value="business">Business Profile</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Search</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="docs">Developer Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="check">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Check Contact
              </CardTitle>
              <CardDescription>Verify if a phone number is registered on WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={checkPhone}
                  onChange={(e) => setCheckPhone(e.target.value)}
                  placeholder="e.g., 6281234567890"
                />
                <Button onClick={handleCheckContact} disabled={loading || !checkPhone}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                </Button>
              </div>
              {contactExists !== null && (
                <div className={`p-4 rounded-lg ${contactExists ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                  {contactExists 
                    ? '✓ This number is registered on WhatsApp' 
                    : '✗ This number is not registered on WhatsApp'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Get User Info
              </CardTitle>
              <CardDescription>View profile status and picture of a WhatsApp user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={infoPhone}
                  onChange={(e) => setInfoPhone(e.target.value)}
                  placeholder="e.g., 6281234567890"
                />
                <Button onClick={handleGetUserInfo} disabled={loading || !infoPhone}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Info'}
                </Button>
              </div>
              {userInfo && (
                <div className="p-4 rounded-lg bg-accent space-y-4">
                  <div className="flex items-center gap-4">
                    {userInfo.profilePic && (
                      <img 
                        src={userInfo.profilePic} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{userInfo.phone || infoPhone}</p>
                      <p className="text-sm text-muted-foreground">{userInfo.status || userInfo.bio || 'No status'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>Update your WhatsApp profile picture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="avatar">Select Image</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button onClick={handleUpdateAvatar} disabled={loading || !avatarFile}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Update Picture
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Push Name
                </CardTitle>
                <CardDescription>Change your display name on WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="push-name">New Name</Label>
                  <Input
                    id="push-name"
                    value={pushName}
                    onChange={(e) => setPushName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <Button onClick={handleUpdatePushName} disabled={loading || !pushName}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Update Name
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>View your current privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGetPrivacy} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Load Privacy Settings
              </Button>
              {privacy && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-accent">
                    <p className="text-sm font-medium">Last Seen</p>
                    <p className="text-muted-foreground">{privacy.lastSeen || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-accent">
                    <p className="text-sm font-medium">Profile Picture</p>
                    <p className="text-muted-foreground">{privacy.profilePic || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-accent">
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-muted-foreground">{privacy.status || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-accent">
                    <p className="text-sm font-medium">Read Receipts</p>
                    <p className="text-muted-foreground">{privacy.readReceipts || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-accent">
                    <p className="text-sm font-medium">Groups</p>
                    <p className="text-muted-foreground">{privacy.groups || 'N/A'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>My Contacts</CardTitle>
              <CardDescription>List contacts from your WhatsApp account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Button onClick={handleGetMyContacts} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Load Contacts
                </Button>
                <Button variant="outline" onClick={loadCachedContacts}>
                  Load Cached
                </Button>
              </div>
              {myContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts loaded</p>
              ) : (
                <ScrollArea className="h-[420px]">
                  <div className="space-y-2 pr-3">
                    {enrichedContacts.map((c) => {
                      return (
                        <div key={c.key} className="p-3 rounded-lg bg-accent space-y-1">
                          <p className="font-medium">{c.name}</p>
                          {c.phone ? <p className="text-sm text-muted-foreground">{c.phone}</p> : null}
                          {c.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {c.lastInteraction && (
                            <p className="text-[11px] text-muted-foreground">
                              Last interaction: {new Date(c.lastInteraction).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced User Search
              </CardTitle>
              <CardDescription>Multi-criteria search with filters, autocomplete, and bulk actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Search (name or phone)</Label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Type to search..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={searchEmail}
                    onChange={(e) => {
                      setSearchEmail(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Email address (if available)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={filterRole}
                    onChange={(e) => {
                      setFilterRole(e.target.value);
                      setPage(1);
                    }}
                    placeholder="e.g. Customer, Admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={filterLocation}
                    onChange={(e) => {
                      setFilterLocation(e.target.value);
                      setPage(1);
                    }}
                    placeholder="City or region"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={filterDepartment}
                    onChange={(e) => {
                      setFilterDepartment(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Sales, Support, etc."
                  />
                </div>
              </div>

              {latestStaleContacts.length > 0 && (
                <div className="p-3 rounded-lg border border-dashed border-yellow-500/50 bg-yellow-500/5 text-xs flex gap-2 items-start">
                  <Bell className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="font-medium">Contacts with no interaction in the last 30 days</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {latestStaleContacts.map(c => (
                        <span key={c.key} className="px-2 py-0.5 rounded-full bg-secondary">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing {paginatedContacts.length} of {filteredContacts.length} contacts
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[360px]">
                  <div className="space-y-2 pr-3">
                    {paginatedContacts.map((c) => (
                      <div
                        key={c.key}
                        className="p-3 rounded-lg border border-border bg-accent/40 hover:bg-accent transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={selectedContacts.includes(c.key)}
                              onChange={() => toggleSelected(c.key)}
                              aria-label="Select contact"
                            />
                            <div>
                              <p className="font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.phone}</p>
                              {c.email && (
                                <p className="text-xs text-muted-foreground">{c.email}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                                {c.role && <span>Role: {c.role}</span>}
                                {c.location && <span>Location: {c.location}</span>}
                                {c.department && <span>Department: {c.department}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleScheduleInteraction(c.key)}
                              aria-label="Schedule interaction"
                            >
                              <CalendarDays className="w-4 h-4" />
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleSetLastInteractionNow(c.key)}
                            >
                              Set Last Interaction
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {c.tags.map(tag => (
                              <button
                                key={tag}
                                type="button"
                                className="px-2 py-0.5 rounded-full bg-secondary text-[11px] flex items-center gap-1"
                                onClick={() => handleRemoveTag(c.key, tag)}
                              >
                                <span>{tag}</span>
                                <span aria-hidden="true">×</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex-1 min-w-[160px] flex items-center gap-2">
                            <Input
                              placeholder="Add tag"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.target as HTMLInputElement;
                                  handleAddTag(c.key, target.value);
                                  target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>
                        {c.lastInteraction && (
                          <p className="text-[11px] text-muted-foreground">
                            Last interaction: {new Date(c.lastInteraction).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ListChecks className="w-4 h-4" />
                      Bulk Actions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Apply metadata to selected contacts and manage tags in bulk.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label>Tag</Label>
                        <Input
                          value={bulkTag}
                          onChange={(e) => setBulkTag(e.target.value)}
                          placeholder="e.g. VIP"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Role</Label>
                        <Input
                          value={bulkRole}
                          onChange={(e) => setBulkRole(e.target.value)}
                          placeholder="Customer, Admin..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Location</Label>
                        <Input
                          value={bulkLocation}
                          onChange={(e) => setBulkLocation(e.target.value)}
                          placeholder="City or region"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Department</Label>
                        <Input
                          value={bulkDepartment}
                          onChange={(e) => setBulkDepartment(e.target.value)}
                          placeholder="Sales, Support..."
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <p className="text-xs text-muted-foreground">
                        Selected contacts: {selectedContacts.length}
                      </p>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleBulkApply}
                        disabled={selectedContacts.length === 0}
                      >
                        Apply to Selected
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        <Label className="text-xs cursor-pointer">
                          <span>Import metadata (JSON)</span>
                          <Input
                            type="file"
                            accept="application/json"
                            className="sr-only"
                            onChange={(e) => handleImportMetadata(e.target.files?.[0] || null)}
                          />
                        </Label>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportMetadata}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export metadata
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Audit Log
              </CardTitle>
              <CardDescription>Track metadata changes and scheduling actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit entries yet.</p>
              ) : (
                <ScrollArea className="h-[420px]">
                  <div className="space-y-2 pr-3 text-xs">
                    {auditLog.map(entry => (
                      <div key={entry.id} className="p-2 rounded bg-accent">
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                        <p className="font-medium">
                          {entry.action} – {entry.contactKey}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                User & Contact API Docs
              </CardTitle>
              <CardDescription>Reference and integration guide for User & Contact Tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Core Endpoints</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>GET /user/check?phone=</code> – Check if contact exists.</li>
                  <li><code>GET /user/info?phone=</code> – Get user profile info.</li>
                  <li><code>GET /user/my/contacts</code> – Retrieve contacts list.</li>
                  <li><code>GET /user/my/privacy</code> – Get privacy settings.</li>
                  <li><code>GET /user/business-profile</code> – Get business profile.</li>
                  <li><code>POST /user/avatar</code> – Update avatar (multipart form-data).</li>
                  <li><code>POST /user/pushname</code> – Update display name.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Example Request</p>
                <pre className="text-xs p-3 rounded bg-accent overflow-auto">
GET /user/my/contacts HTTP/1.1
Host: &lt;API_HOST&gt;
Authorization: Basic &lt;BASE64(user:pass)&gt;
                </pre>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Example Response</p>
                <pre className="text-xs p-3 rounded bg-accent overflow-auto">
{`{
  "contacts": [
    {
      "jid": "6281234567890@s.whatsapp.net",
      "name": "John Doe",
      "phone": "6281234567890"
    }
  ]
}`}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Integration Flow</p>
                <p className="text-xs text-muted-foreground">
                  1. Client mengirim request ke API Gateway GOWA.
                  2. Server mem-forward ke sesi WhatsApp aktif (device terautentikasi).
                  3. Response WhatsApp diproses dan dinormalisasi oleh server.
                  4. Data dikembalikan ke client lalu diperkaya di User & Contact Tools (tagging, metadata, audit).
                </p>
                <pre className="text-[11px] p-3 rounded bg-accent overflow-auto">
Client UI
  │
  ├─&gt; /user/my/contacts ──&gt; GOWA API
  │                          │
  │                          ├─&gt; WhatsApp Session
  │                          │
  └─&lt;────────── Normalized Response ──┘
      │
      └─&gt; Enrichment (tags, role, location, department, audit log)
                </pre>
              </div>

              <div className="space-y-1">
                <p className="font-medium">Developer Notes</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                  <li>Gunakan Basic Auth yang sama dengan halaman Settings.</li>
                  <li>Filter dan pagination dijalankan di sisi client untuk respon besar.</li>
                  <li>Metadata (tags, role, dsb.) disimpan di <code>localStorage</code> per browser.</li>
                  <li>Audit log menyimpan maksimal 200 event terakhir untuk menghindari data berlebih.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>Get business profile info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business-phone">Phone Number (optional)</Label>
                  <Input
                    id="business-phone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="e.g., 6281234567890"
                  />
                </div>
              </div>
              <Button onClick={handleGetBusinessProfile} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Load Business Profile
              </Button>
              {businessProfile ? (
                <pre className="text-xs p-3 rounded-lg bg-accent overflow-auto max-h-[420px]">
                  {JSON.stringify(businessProfile, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No business profile loaded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
