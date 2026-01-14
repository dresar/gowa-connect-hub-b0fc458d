import { useState } from 'react';
import { Send, Image, Video, FileText, MapPin, User, Sticker, BarChart2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  sendText, 
  sendImage, 
  sendVideo, 
  sendAudio, 
  sendDocument, 
  sendPoll, 
  sendLocation, 
  sendContact,
  sendSticker
} from '@/lib/api';
import { useLogs } from '@/contexts/LogContext';
import { useToast } from '@/hooks/use-toast';

export default function SendCenterPage() {
  const { toast } = useToast();
  const { addLog } = useLogs();
  const [loading, setLoading] = useState(false);

  // Text form
  const [textPhone, setTextPhone] = useState('');
  const [textMessage, setTextMessage] = useState('');

  // Media form
  const [mediaPhone, setMediaPhone] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaViewOnce, setMediaViewOnce] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document'>('image');

  // Poll form
  const [pollPhone, setPollPhone] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollMaxAnswers, setPollMaxAnswers] = useState(1);

  // Location form
  const [locPhone, setLocPhone] = useState('');
  const [locLat, setLocLat] = useState('');
  const [locLong, setLocLong] = useState('');

  // Contact form
  const [contactPhone, setContactPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Sticker form
  const [stickerPhone, setStickerPhone] = useState('');
  const [stickerFile, setStickerFile] = useState<File | null>(null);

  const handleSendText = async () => {
    setLoading(true);
    try {
      const response = await sendText(textPhone, textMessage);
      addLog({ type: 'response', method: 'POST', url: '/send/text', data: response.data, status: 200 });
      toast({ title: 'Message sent!', description: `To: ${textPhone}` });
      setTextPhone('');
      setTextMessage('');
    } catch (error: any) {
      addLog({ type: 'error', method: 'POST', url: '/send/text', data: error.response?.data });
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSendMedia = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('phone', mediaPhone);
    if (mediaFile) {
      formData.append('file', mediaFile);
    } else if (mediaUrl) {
      formData.append('url', mediaUrl);
    }
    if (mediaCaption) formData.append('caption', mediaCaption);
    if (mediaViewOnce) formData.append('viewOnce', 'true');

    try {
      const sendFn = { image: sendImage, video: sendVideo, audio: sendAudio, document: sendDocument }[mediaType];
      const response = await sendFn(formData);
      addLog({ type: 'response', method: 'POST', url: `/send/${mediaType}`, data: response.data, status: 200 });
      toast({ title: 'Media sent!' });
      setMediaPhone('');
      setMediaFile(null);
      setMediaUrl('');
      setMediaCaption('');
    } catch (error: any) {
      addLog({ type: 'error', method: 'POST', url: `/send/${mediaType}`, data: error.response?.data });
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSendPoll = async () => {
    setLoading(true);
    const validOptions = pollOptions.filter(o => o.trim());
    try {
      const response = await sendPoll(pollPhone, pollQuestion, validOptions, pollMaxAnswers);
      addLog({ type: 'response', method: 'POST', url: '/send/poll', data: response.data, status: 200 });
      toast({ title: 'Poll sent!' });
      setPollPhone('');
      setPollQuestion('');
      setPollOptions(['', '']);
    } catch (error: any) {
      addLog({ type: 'error', method: 'POST', url: '/send/poll', data: error.response?.data });
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSendLocation = async () => {
    setLoading(true);
    try {
      const response = await sendLocation(locPhone, parseFloat(locLat), parseFloat(locLong));
      addLog({ type: 'response', method: 'POST', url: '/send/location', data: response.data, status: 200 });
      toast({ title: 'Location sent!' });
      setLocPhone('');
      setLocLat('');
      setLocLong('');
    } catch (error: any) {
      addLog({ type: 'error', method: 'POST', url: '/send/location', data: error.response?.data });
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSendContact = async () => {
    setLoading(true);
    try {
      const response = await sendContact(contactPhone, contactName, contactNumber);
      addLog({ type: 'response', method: 'POST', url: '/send/contact', data: response.data, status: 200 });
      toast({ title: 'Contact sent!' });
      setContactPhone('');
      setContactName('');
      setContactNumber('');
    } catch (error: any) {
      addLog({ type: 'error', method: 'POST', url: '/send/contact', data: error.response?.data });
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSendSticker = async () => {
    if (!stickerFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('phone', stickerPhone);
    formData.append('file', stickerFile);

    try {
      const response = await sendSticker(formData);
      addLog({ type: 'response', method: 'POST', url: '/send/sticker', data: response.data, status: 200 });
      toast({ title: 'Sticker sent!' });
      setStickerPhone('');
      setStickerFile(null);
    } catch (error: any) {
      addLog({ type: 'error', method: 'POST', url: '/send/sticker', data: error.response?.data });
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Send Center</h1>
        <p className="text-muted-foreground">Send messages, media, and more</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="text">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
              <TabsTrigger value="text" className="gap-2">
                <Send className="w-4 h-4" />
                <span className="hidden md:inline">Text</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-2">
                <Image className="w-4 h-4" />
                <span className="hidden md:inline">Media</span>
              </TabsTrigger>
              <TabsTrigger value="poll" className="gap-2">
                <BarChart2 className="w-4 h-4" />
                <span className="hidden md:inline">Poll</span>
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="w-4 h-4" />
                <span className="hidden md:inline">Location</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden md:inline">Contact</span>
              </TabsTrigger>
              <TabsTrigger value="sticker" className="gap-2">
                <Sticker className="w-4 h-4" />
                <span className="hidden md:inline">Sticker</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="text-phone">Phone Number</Label>
                  <Input
                    id="text-phone"
                    value={textPhone}
                    onChange={(e) => setTextPhone(e.target.value)}
                    placeholder="e.g., 6281234567890"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="text-message">Message</Label>
                <Textarea
                  id="text-message"
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                />
              </div>
              <Button onClick={handleSendText} disabled={loading || !textPhone || !textMessage}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Message
              </Button>
            </TabsContent>

            <TabsContent value="media" className="space-y-4 mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="media-phone">Phone Number</Label>
                  <Input
                    id="media-phone"
                    value={mediaPhone}
                    onChange={(e) => setMediaPhone(e.target.value)}
                    placeholder="e.g., 6281234567890"
                  />
                </div>
                <div>
                  <Label>Media Type</Label>
                  <div className="flex gap-2 mt-1">
                    {(['image', 'video', 'audio', 'document'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={mediaType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMediaType(type)}
                      >
                        {type === 'image' && <Image className="w-4 h-4" />}
                        {type === 'video' && <Video className="w-4 h-4" />}
                        {type === 'audio' && <FileText className="w-4 h-4" />}
                        {type === 'document' && <FileText className="w-4 h-4" />}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="media-file">Upload File</Label>
                  <Input
                    id="media-file"
                    type="file"
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label htmlFor="media-url">Or Media URL</Label>
                  <Input
                    id="media-url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="media-caption">Caption (optional)</Label>
                <Input
                  id="media-caption"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="Add a caption..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="view-once" checked={mediaViewOnce} onCheckedChange={setMediaViewOnce} />
                <Label htmlFor="view-once">View Once</Label>
              </div>
              <Button onClick={handleSendMedia} disabled={loading || !mediaPhone || (!mediaFile && !mediaUrl)}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Media
              </Button>
            </TabsContent>

            <TabsContent value="poll" className="space-y-4 mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="poll-phone">Phone Number</Label>
                  <Input
                    id="poll-phone"
                    value={pollPhone}
                    onChange={(e) => setPollPhone(e.target.value)}
                    placeholder="e.g., 6281234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="poll-max">Max Answers</Label>
                  <Input
                    id="poll-max"
                    type="number"
                    min={1}
                    value={pollMaxAnswers}
                    onChange={(e) => setPollMaxAnswers(parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="poll-question">Question</Label>
                <Input
                  id="poll-question"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="What's your question?"
                />
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                {pollOptions.map((opt, index) => (
                  <Input
                    key={index}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[index] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`Option ${index + 1}`}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                >
                  Add Option
                </Button>
              </div>
              <Button onClick={handleSendPoll} disabled={loading || !pollPhone || !pollQuestion}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Poll
              </Button>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 mt-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="loc-phone">Phone Number</Label>
                  <Input
                    id="loc-phone"
                    value={locPhone}
                    onChange={(e) => setLocPhone(e.target.value)}
                    placeholder="e.g., 6281234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="loc-lat">Latitude</Label>
                  <Input
                    id="loc-lat"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    placeholder="-6.2088"
                  />
                </div>
                <div>
                  <Label htmlFor="loc-long">Longitude</Label>
                  <Input
                    id="loc-long"
                    value={locLong}
                    onChange={(e) => setLocLong(e.target.value)}
                    placeholder="106.8456"
                  />
                </div>
              </div>
              <Button onClick={handleSendLocation} disabled={loading || !locPhone || !locLat || !locLong}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Location
              </Button>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contact-phone">Recipient Phone</Label>
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g., 6281234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-name">Contact Name</Label>
                  <Input
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-number">Contact Number</Label>
                  <Input
                    id="contact-number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="6289876543210"
                  />
                </div>
              </div>
              <Button onClick={handleSendContact} disabled={loading || !contactPhone || !contactName || !contactNumber}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Contact
              </Button>
            </TabsContent>

            <TabsContent value="sticker" className="space-y-4 mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sticker-phone">Phone Number</Label>
                  <Input
                    id="sticker-phone"
                    value={stickerPhone}
                    onChange={(e) => setStickerPhone(e.target.value)}
                    placeholder="e.g., 6281234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="sticker-file">Image File</Label>
                  <Input
                    id="sticker-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setStickerFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <Button onClick={handleSendSticker} disabled={loading || !stickerPhone || !stickerFile}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Sticker
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
