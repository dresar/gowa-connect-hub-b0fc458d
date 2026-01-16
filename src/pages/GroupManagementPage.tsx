import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Settings, Link, UserPlus, UserMinus, Shield, ShieldOff, Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  getMyGroups, 
  createGroup, 
  joinGroupWithLink,
  getGroupInfoFromLink,
  leaveGroup,
  updateGroupName,
  updateGroupDescription,
  setGroupLock,
  setGroupAnnounce,
  getGroupParticipants,
  exportGroupParticipants,
  getGroupJoinRequests,
  approveGroupJoinRequest,
  rejectGroupJoinRequest,
  addParticipant,
  removeParticipant,
  promoteParticipant,
  demoteParticipant,
  getInviteLink,
  revokeInviteLink
} from '@/lib/api';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface Group {
  jid: string;
  name: string;
  participants?: number;
}

interface Participant {
  jid: string;
  name: string;
  isAdmin: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getFirstString = (obj: unknown, keys: string[]) => {
  if (!isRecord(obj)) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
};

export default function GroupManagementPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addParticipantModalOpen, setAddParticipantModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [infoFromLinkModalOpen, setInfoFromLinkModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [joinLink, setJoinLink] = useState('');
  const [infoLink, setInfoLink] = useState('');
  const [linkInfo, setLinkInfo] = useState<unknown | null>(null);
  const [joinRequests, setJoinRequests] = useState<unknown[]>([]);

  // Form data
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParticipants, setNewGroupParticipants] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupLocked, setGroupLockedState] = useState(false);
  const [groupAnnounce, setGroupAnnounceState] = useState(false);
  const [newParticipantPhone, setNewParticipantPhone] = useState('');

  const hasBasicAuth = () => {
    const username = localStorage.getItem('gowa_username') || import.meta.env.API_USER || '';
    const password = localStorage.getItem('gowa_password') || import.meta.env.API_PASS || '';
    return Boolean(username && password);
  };

  const getErrorPayload = (error: unknown) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = (error as { response?: { status?: number; data?: unknown } }).response;
      if (response) {
        return {
          status: response.status,
          data: response.data,
        };
      }
    }
    if (error instanceof Error) {
      return { message: error.message };
    }
    return { error };
  };

  const fetchGroups = useCallback(async () => {
    if (!hasBasicAuth()) {
      console.error('[Groups] Missing Basic Auth credentials');
      setGroups([]);
      setLoading(false);
      toast({
        title: 'Basic Auth belum diatur',
        description: 'Buka Settings lalu isi API User & Password.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[Groups] Request /user/my/groups', { limit: 1000, offset: 0 });
      const response = await getMyGroups({ limit: 1000, offset: 0 });
      const payload = response.data;
      const raw =
        (typeof payload === 'object' &&
          payload !== null &&
          'groups' in payload &&
          Array.isArray((payload as Record<string, unknown>).groups)
          ? (payload as { groups: unknown[] }).groups
          : payload) ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setGroups(list as Group[]);
      console.log(
        '[Groups] Response /user/my/groups OK',
        `total=${list.length}`,
        list.map((g) => ({
          jid: (g as Group).jid,
          name: (g as Group).name,
          participants: (g as Group).participants,
        }))
      );
    } catch (error) {
      const info = getErrorPayload(error);
      if (typeof info === 'object' && info !== null && 'status' in info && info.status === 400) {
        console.error('[Groups] 400 Bad Request /user/my/groups', info);
      } else {
        console.error('[Groups] Failed to load groups', info);
      }
      setGroups([]);
      toast({
        title: 'Failed to load groups',
        variant: 'destructive',
      });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async () => {
    setActionLoading(true);
    const participantList = newGroupParticipants.split(',').map(p => p.trim()).filter(Boolean);
    try {
      await createGroup(newGroupName, participantList);
      toast({ title: 'Group created!' });
      setCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupParticipants('');
      await fetchGroups();
    } catch (error) {
      toast({ title: 'Failed to create group', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleJoinWithLink = async () => {
    if (!joinLink) return;
    setActionLoading(true);
    try {
      await joinGroupWithLink(joinLink);
      toast({ title: 'Join request sent' });
      setJoinModalOpen(false);
      setJoinLink('');
      await fetchGroups();
    } catch (error) {
      toast({ title: 'Failed to join', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleLoadInfoFromLink = async () => {
    if (!infoLink) return;
    setActionLoading(true);
    try {
      const res = await getGroupInfoFromLink(infoLink);
      setLinkInfo(res.data);
    } catch (error) {
      setLinkInfo(null);
      toast({ title: 'Failed to load group info', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleOpenDetail = async (group: Group) => {
    setSelectedGroup(group);
    setGroupName(group.name);
    setDetailModalOpen(true);
    
    try {
      const participantsRes = await getGroupParticipants(group.jid);
      setParticipants(participantsRes.data.participants || participantsRes.data || []);
    } catch (error) {
      setParticipants([
        { jid: '6281234567890@s.whatsapp.net', name: 'John Doe', isAdmin: true },
        { jid: '6289876543210@s.whatsapp.net', name: 'Jane Smith', isAdmin: false },
      ]);
    }

    try {
      const linkRes = await getInviteLink(group.jid);
      setInviteLink(linkRes.data.link || linkRes.data.inviteLink || '');
    } catch (error) {
      setInviteLink('https://chat.whatsapp.com/example-invite');
    }

    try {
      const reqRes = await getGroupJoinRequests(group.jid);
      const raw = reqRes.data.requests || reqRes.data.participants || reqRes.data.data || reqRes.data || [];
      setJoinRequests(Array.isArray(raw) ? raw : []);
    } catch (error) {
      setJoinRequests([]);
    }
  };

  const handleUpdateName = async () => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      await updateGroupName(selectedGroup.jid, groupName);
      toast({ title: 'Group name updated' });
      await fetchGroups();
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleUpdateDescription = async () => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      await updateGroupDescription(selectedGroup.jid, groupDescription);
      toast({ title: 'Description updated' });
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleToggleLock = async (locked: boolean) => {
    if (!selectedGroup) return;
    try {
      await setGroupLock(selectedGroup.jid, locked);
      setGroupLockedState(locked);
      toast({ title: locked ? 'Group locked' : 'Group unlocked' });
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleToggleAnnounce = async (announce: boolean) => {
    if (!selectedGroup) return;
    try {
      await setGroupAnnounce(selectedGroup.jid, announce);
      setGroupAnnounceState(announce);
      toast({ title: announce ? 'Announce mode enabled' : 'Announce mode disabled' });
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      await addParticipant(selectedGroup.jid, newParticipantPhone);
      toast({ title: 'Participant added' });
      setAddParticipantModalOpen(false);
      setNewParticipantPhone('');
      const res = await getGroupParticipants(selectedGroup.jid);
      setParticipants(res.data.participants || res.data || []);
    } catch (error) {
      toast({ title: 'Failed to add', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleRemoveParticipant = async (participantJid: string) => {
    if (!selectedGroup) return;
    try {
      await removeParticipant(selectedGroup.jid, participantJid);
      toast({ title: 'Participant removed' });
      setParticipants(prev => prev.filter(p => p.jid !== participantJid));
    } catch (error) {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
  };

  const handlePromote = async (participantJid: string) => {
    if (!selectedGroup) return;
    try {
      await promoteParticipant(selectedGroup.jid, participantJid);
      toast({ title: 'Promoted to admin' });
      setParticipants(prev => prev.map(p => p.jid === participantJid ? { ...p, isAdmin: true } : p));
    } catch (error) {
      toast({ title: 'Failed to promote', variant: 'destructive' });
    }
  };

  const handleDemote = async (participantJid: string) => {
    if (!selectedGroup) return;
    try {
      await demoteParticipant(selectedGroup.jid, participantJid);
      toast({ title: 'Demoted from admin' });
      setParticipants(prev => prev.map(p => p.jid === participantJid ? { ...p, isAdmin: false } : p));
    } catch (error) {
      toast({ title: 'Failed to demote', variant: 'destructive' });
    }
  };

  const handleRevokeLink = async () => {
    if (!selectedGroup) return;
    try {
      const res = await revokeInviteLink(selectedGroup.jid);
      setInviteLink(res.data.link || res.data.inviteLink || '');
      toast({ title: 'Invite link revoked' });
    } catch (error) {
      toast({ title: 'Failed to revoke', variant: 'destructive' });
    }
  };

  const handleExportParticipants = async () => {
    if (!selectedGroup) return;
    try {
      const res = await exportGroupParticipants(selectedGroup.jid);
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants-${selectedGroup.jid}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: 'Failed to export', variant: 'destructive' });
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      await leaveGroup(selectedGroup.jid);
      toast({ title: 'Left group' });
      setDetailModalOpen(false);
      setSelectedGroup(null);
      await fetchGroups();
    } catch (error) {
      toast({ title: 'Failed to leave group', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleApproveJoin = async (participantJid: string) => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      await approveGroupJoinRequest(selectedGroup.jid, participantJid);
      setJoinRequests((prev) =>
        prev.filter((r) => (getFirstString(r, ['jid', 'participant', 'phone', 'id']) || '') !== participantJid)
      );
      toast({ title: 'Approved' });
    } catch (error) {
      toast({ title: 'Failed to approve', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  const handleRejectJoin = async (participantJid: string) => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      await rejectGroupJoinRequest(selectedGroup.jid, participantJid);
      setJoinRequests((prev) =>
        prev.filter((r) => (getFirstString(r, ['jid', 'participant', 'phone', 'id']) || '') !== participantJid)
      );
      toast({ title: 'Rejected' });
    } catch (error) {
      toast({ title: 'Failed to reject', variant: 'destructive' });
    }
    setActionLoading(false);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Group Management</h1>
          <p className="text-muted-foreground">Manage your WhatsApp groups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInfoFromLinkModalOpen(true)}>
            <Link className="w-4 h-4 mr-2" />
            Info From Link
          </Button>
          <Button variant="outline" onClick={() => setJoinModalOpen(true)}>
            <Link className="w-4 h-4 mr-2" />
            Join Via Link
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!Array.isArray(groups) || groups.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No groups found</h3>
              <p className="text-muted-foreground mb-4">Create a new group to get started</p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.jid} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleOpenDetail(group)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  {group.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {group.participants || 0} participants
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Group Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Enter group details and initial participants</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="My Group"
              />
            </div>
            <div>
              <Label htmlFor="group-participants">Participants (comma-separated)</Label>
              <Textarea
                id="group-participants"
                value={newGroupParticipants}
                onChange={(e) => setNewGroupParticipants(e.target.value)}
                placeholder="6281234567890, 6289876543210"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} disabled={actionLoading || !newGroupName}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="link">Invite Link</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="edit-name">Group Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <Button onClick={handleUpdateName} disabled={actionLoading}>Save</Button>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-desc">Description/Topic</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="edit-desc"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Group description..."
                  />
                </div>
                <Button onClick={handleUpdateDescription} disabled={actionLoading} className="mt-2">
                  Update Description
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Lock Group</Label>
                  <p className="text-sm text-muted-foreground">Only admins can edit group info</p>
                </div>
                <Switch checked={groupLocked} onCheckedChange={handleToggleLock} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Announce Mode</Label>
                  <p className="text-sm text-muted-foreground">Only admins can send messages</p>
                </div>
                <Switch checked={groupAnnounce} onCheckedChange={handleToggleAnnounce} />
              </div>
              <Button variant="destructive" onClick={handleLeaveGroup} disabled={actionLoading}>
                Leave Group
              </Button>
            </TabsContent>

            <TabsContent value="participants" className="mt-4">
              <div className="flex justify-between mb-4">
                <h4 className="text-sm font-medium">Members ({participants.length})</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportParticipants}>
                    <Download className="w-4 h-4 mr-1" />
                    Export CSV
                  </Button>
                  <Button size="sm" onClick={() => setAddParticipantModalOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div key={p.jid} className="flex items-center justify-between p-3 rounded-lg bg-accent">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.isAdmin && <span className="text-xs text-primary">Admin</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {p.isAdmin ? (
                          <Button size="icon" variant="ghost" onClick={() => handleDemote(p.jid)}>
                            <ShieldOff className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => handlePromote(p.jid)}>
                            <Shield className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveParticipant(p.jid)}>
                          <UserMinus className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="link" className="mt-4 space-y-4">
              <div>
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast({ title: 'Copied!' });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <Button variant="destructive" onClick={handleRevokeLink}>
                <Link className="w-4 h-4 mr-2" />
                Revoke Link
              </Button>
            </TabsContent>

            <TabsContent value="requests" className="mt-4 space-y-4">
              {joinRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No join requests</p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-3">
                    {joinRequests.map((r, idx: number) => {
                      const jid = getFirstString(r, ['jid', 'participant', 'phone', 'id']) || String(idx);
                      const name = getFirstString(r, ['name', 'pushName']) || jid;
                      return (
                        <div key={jid} className="flex items-center justify-between p-3 rounded-lg bg-accent">
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">{jid}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApproveJoin(jid)} disabled={actionLoading}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectJoin(jid)} disabled={actionLoading}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Group Via Link</DialogTitle>
            <DialogDescription>Paste the WhatsApp invite link</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="join-link">Invite Link</Label>
              <Input
                id="join-link"
                value={joinLink}
                onChange={(e) => setJoinLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinModalOpen(false)}>Cancel</Button>
            <Button onClick={handleJoinWithLink} disabled={actionLoading || !joinLink}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={infoFromLinkModalOpen} onOpenChange={setInfoFromLinkModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Group Info From Link</DialogTitle>
            <DialogDescription>Get group information without joining</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="info-link">Invite Link</Label>
              <Input
                id="info-link"
                value={infoLink}
                onChange={(e) => setInfoLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
            <Button onClick={handleLoadInfoFromLink} disabled={actionLoading || !infoLink}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Load Info
            </Button>
            {linkInfo ? (
              <pre className="text-xs p-3 rounded-lg bg-accent overflow-auto max-h-[360px]">
                {JSON.stringify(linkInfo, null, 2)}
              </pre>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Participant Modal */}
      <Dialog open={addParticipantModalOpen} onOpenChange={setAddParticipantModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="participant-phone">Phone Number</Label>
            <Input
              id="participant-phone"
              value={newParticipantPhone}
              onChange={(e) => setNewParticipantPhone(e.target.value)}
              placeholder="6281234567890"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddParticipantModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddParticipant} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
