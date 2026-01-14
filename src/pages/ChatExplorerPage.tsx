import { useState, useEffect } from 'react';
import { Search, Pin, PinOff, Check, Trash2, Download, MessageCircle, Image, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { getChats, getChatMessages, pinChat, markMessageRead, deleteMessage, revokeMessage } from '@/lib/api';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface Chat {
  jid: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  pinned?: boolean;
  hasMedia?: boolean;
}

interface Message {
  id: string;
  fromMe: boolean;
  text?: string;
  timestamp: string;
  type: string;
  mediaUrl?: string;
}

export default function ChatExplorerPage() {
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMediaOnly, setShowMediaOnly] = useState(false);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const response = await getChats();
      setChats(response.data.chats || response.data || []);
    } catch (error) {
      // Mock data for demo
      setChats([
        { jid: '6281234567890@s.whatsapp.net', name: 'John Doe', lastMessage: 'Hello!', pinned: true },
        { jid: '6289876543210@s.whatsapp.net', name: 'Jane Smith', lastMessage: 'How are you?', hasMedia: true },
        { jid: '6281122334455@s.whatsapp.net', name: 'Group Chat', lastMessage: 'Meeting at 3pm' },
      ]);
    }
    setLoading(false);
  };

  const fetchMessages = async (jid: string) => {
    setMessagesLoading(true);
    try {
      const response = await getChatMessages(jid);
      setMessages(response.data.messages || response.data || []);
    } catch (error) {
      // Mock data
      setMessages([
        { id: '1', fromMe: false, text: 'Hello there!', timestamp: '10:30 AM', type: 'text' },
        { id: '2', fromMe: true, text: 'Hi! How are you?', timestamp: '10:31 AM', type: 'text' },
        { id: '3', fromMe: false, text: 'I\'m good, thanks!', timestamp: '10:32 AM', type: 'text' },
      ]);
    }
    setMessagesLoading(false);
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    fetchMessages(chat.jid);
  };

  const handlePinChat = async (jid: string, pin: boolean) => {
    try {
      await pinChat(jid, pin);
      toast({ title: pin ? 'Chat pinned' : 'Chat unpinned' });
      await fetchChats();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update pin status', variant: 'destructive' });
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markMessageRead(id);
      toast({ title: 'Marked as read' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteMessage(id);
      toast({ title: 'Message deleted' });
      if (selectedChat) fetchMessages(selectedChat.jid);
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleRevokeMessage = async (id: string) => {
    try {
      await revokeMessage(id);
      toast({ title: 'Message revoked' });
      if (selectedChat) fetchMessages(selectedChat.jid);
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMedia = !showMediaOnly || chat.hasMedia;
    return matchesSearch && matchesMedia;
  });

  if (loading) return <PageLoader />;

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chat Explorer</h1>
          <p className="text-muted-foreground">Browse and manage your conversations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-4rem)]">
        {/* Chat List */}
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Chats</CardTitle>
            <div className="space-y-3 mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="media-filter" 
                  checked={showMediaOnly}
                  onCheckedChange={setShowMediaOnly}
                />
                <Label htmlFor="media-filter" className="text-sm">Has Media</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {filteredChats.map((chat) => (
                <div
                  key={chat.jid}
                  onClick={() => handleSelectChat(chat)}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                    selectedChat?.jid === chat.jid ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{chat.name}</span>
                          {chat.pinned && <Pin className="w-3 h-3 text-primary" />}
                          {chat.hasMedia && <Image className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinChat(chat.jid, !chat.pinned);
                      }}
                    >
                      {chat.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message View */}
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-lg">
              {selectedChat ? selectedChat.name : 'Select a chat'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            {selectedChat ? (
              messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <PageLoader />
                </div>
              ) : (
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <ContextMenu key={msg.id}>
                        <ContextMenuTrigger>
                          <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.fromMe
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-accent text-accent-foreground'
                              }`}
                            >
                              {msg.type === 'image' && (
                                <div className="flex items-center gap-2 mb-2">
                                  <Image className="w-4 h-4" />
                                  <span className="text-xs">Image</span>
                                </div>
                              )}
                              {msg.type === 'document' && (
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-4 h-4" />
                                  <span className="text-xs">Document</span>
                                </div>
                              )}
                              <p>{msg.text || '[Media]'}</p>
                              <span className={`text-xs mt-1 block ${
                                msg.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleMarkRead(msg.id)}>
                            <Check className="w-4 h-4 mr-2" />
                            Mark as Read
                          </ContextMenuItem>
                          {msg.mediaUrl && (
                            <ContextMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download Media
                            </ContextMenuItem>
                          )}
                          <ContextMenuItem 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </ContextMenuItem>
                          {msg.fromMe && (
                            <ContextMenuItem 
                              onClick={() => handleRevokeMessage(msg.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Revoke
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                </ScrollArea>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a chat to view messages</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
