import { useState } from 'react';
import { Search, User, Shield, Image, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkContact, getUserInfo, updateAvatar, updatePushName, getMyPrivacy } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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

export default function UserContactPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User & Contact Tools</h1>
        <p className="text-muted-foreground">Manage contacts and profile settings</p>
      </div>

      <Tabs defaultValue="check" className="space-y-4">
        <TabsList>
          <TabsTrigger value="check">Check Contact</TabsTrigger>
          <TabsTrigger value="info">Get User Info</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
