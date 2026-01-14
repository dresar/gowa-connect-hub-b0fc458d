import { useState } from 'react';
import { Send, Plus, Trash2, Upload, Download, Loader2, Users, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sendText } from '@/lib/api';
import { useLogs } from '@/contexts/LogContext';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  phone: string;
  name?: string;
  variables?: Record<string, string>;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

interface SendResult {
  phone: string;
  status: 'success' | 'failed';
  error?: string;
}

const defaultTemplates: Template[] = [
  {
    id: '1',
    name: 'Greeting',
    content: 'Hello {{name}}, welcome to our service! We hope you enjoy using GOWA.'
  },
  {
    id: '2',
    name: 'Reminder',
    content: 'Hi {{name}}, this is a reminder about your appointment on {{date}}.'
  },
  {
    id: '3',
    name: 'Promotion',
    content: 'Dear {{name}}, we have an exclusive offer for you! Use code {{code}} for {{discount}}% off.'
  }
];

export default function BulkMessagingPage() {
  const { toast } = useToast();
  const { addLog } = useLogs();
  
  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([{ phone: '', name: '' }]);
  const [bulkText, setBulkText] = useState('');
  
  // Templates
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  
  // Message
  const [message, setMessage] = useState('');
  
  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(1000);

  const addContact = () => {
    setContacts([...contacts, { phone: '', name: '' }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  const parseBulkContacts = () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    const parsed: Contact[] = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        phone: parts[0] || '',
        name: parts[1] || ''
      };
    });
    setContacts(parsed);
    toast({ 
      title: 'Contacts imported', 
      description: `${parsed.length} contacts parsed from text` 
    });
  };

  const exportContacts = () => {
    const csv = contacts.map(c => `${c.phone},${c.name || ''}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setMessage(template.content);
  };

  const saveTemplate = () => {
    if (!newTemplateName || !newTemplateContent) return;
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: newTemplateName,
      content: newTemplateContent
    };
    setTemplates([...templates, newTemplate]);
    setNewTemplateName('');
    setNewTemplateContent('');
    toast({ title: 'Template saved', description: `"${newTemplateName}" has been saved` });
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const personalizeMessage = (msg: string, contact: Contact): string => {
    let personalized = msg;
    personalized = personalized.replace(/\{\{name\}\}/g, contact.name || 'Customer');
    personalized = personalized.replace(/\{\{phone\}\}/g, contact.phone);
    
    // Replace any custom variables
    if (contact.variables) {
      Object.entries(contact.variables).forEach(([key, value]) => {
        personalized = personalized.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });
    }
    
    return personalized;
  };

  const sendBulkMessages = async () => {
    const validContacts = contacts.filter(c => c.phone.trim());
    if (validContacts.length === 0 || !message.trim()) {
      toast({ 
        title: 'Invalid input', 
        description: 'Please add contacts and a message',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    setResults([]);
    setProgress(0);

    const newResults: SendResult[] = [];

    for (let i = 0; i < validContacts.length; i++) {
      const contact = validContacts[i];
      const personalizedMessage = personalizeMessage(message, contact);

      try {
        const response = await sendText(contact.phone, personalizedMessage);
        addLog({
          type: 'response',
          method: 'POST',
          url: '/send/message',
          data: response.data,
          status: 200
        });
        newResults.push({ phone: contact.phone, status: 'success' });
      } catch (error: any) {
        addLog({
          type: 'error',
          method: 'POST',
          url: '/send/message',
          data: error.response?.data || error.message
        });
        newResults.push({ 
          phone: contact.phone, 
          status: 'failed',
          error: error.response?.data?.message || error.message || 'Unknown error'
        });
      }

      setResults([...newResults]);
      setProgress(((i + 1) / validContacts.length) * 100);

      // Delay between messages to avoid rate limiting
      if (i < validContacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
      }
    }

    setIsSending(false);
    const successCount = newResults.filter(r => r.status === 'success').length;
    toast({
      title: 'Bulk sending complete',
      description: `${successCount}/${validContacts.length} messages sent successfully`
    });
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bulk Messaging</h1>
        <p className="text-muted-foreground">Send messages to multiple contacts at once</p>
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="w-4 h-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="message" className="gap-2">
            <Send className="w-4 h-4" />
            Message
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Manage Contacts</CardTitle>
              <CardDescription>Add contacts manually or import from CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={addContact}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
                <Button variant="outline" onClick={exportContacts}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2">
                  {contacts.map((contact, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Phone (e.g., 6281234567890)"
                        value={contact.phone}
                        onChange={(e) => updateContact(index, 'phone', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Name (optional)"
                        value={contact.name || ''}
                        onChange={(e) => updateContact(index, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContact(index)}
                        disabled={contacts.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t pt-4">
                <Label className="mb-2 block">Bulk Import (phone,name per line)</Label>
                <Textarea
                  placeholder="6281234567890,John Doe&#10;6289876543210,Jane Smith"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={4}
                />
                <Button variant="outline" onClick={parseBulkContacts} className="mt-2">
                  <Upload className="w-4 h-4 mr-2" />
                  Parse & Import
                </Button>
              </div>

              <Badge variant="secondary">
                {contacts.filter(c => c.phone.trim()).length} valid contacts
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>Use variables like {'{{name}}'}, {'{{phone}}'} for personalization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id 
                        ? 'ring-2 ring-primary' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        {!defaultTemplates.find(t => t.id === template.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(template.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {template.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium">Create New Template</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="My Template"
                    />
                  </div>
                </div>
                <div>
                  <Label>Template Content</Label>
                  <Textarea
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    placeholder="Hello {{name}}, your message here..."
                    rows={3}
                  />
                </div>
                <Button onClick={saveTemplate} disabled={!newTemplateName || !newTemplateContent}>
                  <Plus className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="message">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>Write your message and configure sending options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Message Content</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here. Use {{name}} for personalization..."
                  rows={6}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available variables: {'{{name}}'}, {'{{phone}}'}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Delay between messages (ms)</Label>
                  <Input
                    type="number"
                    value={delayBetweenMessages}
                    onChange={(e) => setDelayBetweenMessages(parseInt(e.target.value) || 1000)}
                    min={500}
                    max={10000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 1000-3000ms to avoid rate limiting
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Badge variant="outline">
                  {contacts.filter(c => c.phone.trim()).length} recipients
                </Badge>
                <Button 
                  onClick={sendBulkMessages} 
                  disabled={isSending || !message.trim() || contacts.filter(c => c.phone.trim()).length === 0}
                  size="lg"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send to All
                    </>
                  )}
                </Button>
              </div>

              {isSending && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground text-center">
                    Sending... {Math.round(progress)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Send Results</CardTitle>
              <CardDescription>View the status of sent messages</CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No results yet. Send messages to see results here.
                </div>
              ) : (
                <>
                  <div className="flex gap-4 mb-4">
                    <Badge variant="default" className="bg-primary">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {successCount} Success
                    </Badge>
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      {failedCount} Failed
                    </Badge>
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {results.map((result, index) => (
                        <div 
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            result.status === 'success' 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'bg-destructive/10 border border-destructive/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {result.status === 'success' ? (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive" />
                            )}
                            <span className="font-mono">{result.phone}</span>
                          </div>
                          {result.error && (
                            <span className="text-xs text-destructive">{result.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
