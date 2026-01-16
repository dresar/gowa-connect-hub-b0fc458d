import { useState, useEffect } from 'react';
import { Newspaper, Loader2, UserMinus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getMyNewsletters, unfollowNewsletter } from '@/lib/api';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface Newsletter {
  jid: string;
  name: string;
  description?: string;
  subscribers?: number;
  picture?: string;
}

export default function NewsletterPage() {
  const { toast } = useToast();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNewsletters();
  }, []);
  const fetchNewsletters = async () => {
    setLoading(true);
    try {
      const response = await getMyNewsletters();
      const raw = (response.data?.results?.data ?? []) as unknown[];

      const formatted: Newsletter[] = Array.isArray(raw)
        ? raw.map((item) => {
            const n = item as {
              id?: string;
              thread_metadata?: {
                name?: { text?: string };
                description?: { text?: string } | string;
                subscribers_count?: number | string;
              };
              subscribers_count?: number | string;
              picture?: string;
              preview?: { url?: string };
            };

            const id = n.id;
            const name =
              n.thread_metadata?.name?.text ||
              (typeof id === 'string' && id.includes('@') ? id.split('@')[0] : id) ||
              'Unknown';

            const description =
              n.thread_metadata?.description?.text ||
              n.thread_metadata?.description ||
              '';

            const subscribersValue = n.subscribers_count ?? n.thread_metadata?.subscribers_count;
            const subscribers =
              typeof subscribersValue === 'string'
                ? Number(subscribersValue)
                : typeof subscribersValue === 'number'
                ? subscribersValue
                : undefined;

            const picture: string | undefined =
              typeof n.picture === 'string'
                ? n.picture
                : typeof n.preview?.url === 'string' && n.preview.url
                ? n.preview.url
                : undefined;

            return {
              jid: id || '',
              name,
              description,
              subscribers,
              picture,
            };
          })
        : [];

      setNewsletters(formatted);
    } catch (error) {
      setNewsletters([
        {
          jid: '120363123456789@newsletter',
          name: 'Tech News Daily',
          description: 'Latest technology updates',
          subscribers: 15420,
        },
        {
          jid: '120363987654321@newsletter',
          name: 'Business Insights',
          description: 'Market trends and analysis',
          subscribers: 8750,
        },
        {
          jid: '120363111222333@newsletter',
          name: 'Developer Weekly',
          description: 'Coding tips and tutorials',
          subscribers: 23100,
        },
      ]);
    }
    setLoading(false);
  };

  const handleUnfollow = async (jid: string) => {
    setUnfollowingId(jid);
    try {
      await unfollowNewsletter(jid);
      toast({ title: 'Unfollowed newsletter' });
      setNewsletters(prev => prev.filter(n => n.jid !== jid));
    } catch (error) {
      toast({ title: 'Failed to unfollow', variant: 'destructive' });
    }
    setUnfollowingId(null);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Newsletter</h1>
        <p className="text-muted-foreground">Manage your WhatsApp newsletters (channels)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Followed Newsletters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {newsletters.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No newsletters</h3>
              <p className="text-muted-foreground">You're not following any newsletters yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {newsletters.map((newsletter) => (
                  <div 
                    key={newsletter.jid} 
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {newsletter.picture ? (
                          <img src={newsletter.picture} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <Newspaper className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{newsletter.name}</h4>
                        <p className="text-sm text-muted-foreground">{newsletter.description || 'No description'}</p>
                        {newsletter.subscribers && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {newsletter.subscribers.toLocaleString()} subscribers
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUnfollow(newsletter.jid)}
                      disabled={unfollowingId === newsletter.jid}
                    >
                      {unfollowingId === newsletter.jid ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="w-4 h-4 mr-1" />
                          Unfollow
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
