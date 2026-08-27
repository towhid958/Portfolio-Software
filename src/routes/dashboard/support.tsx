import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Clock, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/dashboard/support')({
  component: ClientSupport,
});

function ClientSupport() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['client-support-messages'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return [];
      
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('email', session.user.email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('contact_messages')
        .insert({
          email: session.user.email!,
          name: session.user.user_metadata?.['full_name'] || 'Client',
          message: message,
          subject: 'Support Ticket from Dashboard',
          status: 'pending'
        });

      if (error) throw error;
      
      toast.success('Message sent! We will get back to you shortly.');
      setMessage('');
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'replied': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Support Center</h1>
        <p className="text-muted-foreground mt-1">Get in touch with Hasan or track your support inquiries.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inquiry History</CardTitle>
            <CardDescription>Messages you've sent to our team.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center py-8">Loading messages...</div>
              ) : messages?.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground">No support inquiries found.</p>
                </div>
              ) : (
                messages?.map(msg => (
                  <div key={msg.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(msg.status || 'pending')}>
                        {msg.status || 'pending'}
                      </Badge>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(msg.created_at!).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-sm font-medium">{msg.subject || 'No Subject'}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                    {msg.internal_notes && (
                      <div className="bg-primary/5 p-3 rounded text-sm italic">
                        <span className="font-semibold block mb-1 not-italic">Response:</span>
                        {msg.internal_notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit sticky top-24">
          <CardHeader>
            <CardTitle>New Inquiry</CardTitle>
            <CardDescription>Need help? Send a message.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                className="w-full min-h-[120px] p-3 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="Describe your issue or request..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Send className="h-4 w-4" />
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
