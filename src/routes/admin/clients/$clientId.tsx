import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getClientDetail } from '@/lib/users.functions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  FileText,
  FolderOpen,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

export const Route = createFileRoute('/admin/clients/$clientId')({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const fetchClientDetail = useServerFn(getClientDetail);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-client-detail', clientId],
    queryFn: () => fetchClientDetail({ data: { clientId } }),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading client...</div>;
  if (error || !data) return <div className="p-8 text-center text-muted-foreground">Client not found.</div>;

  const { profile, status, last_sign_in_at, orders, invoices, documents, conversations } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin/clients">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{profile.full_name || 'No Name'}</h2>
          <p className="text-muted-foreground">Client Profile</p>
        </div>
        {status === 'suspended' ? (
          <Badge variant="destructive" className="ml-auto">Suspended</Badge>
        ) : status === 'active' ? (
          <Badge variant="secondary" className="ml-auto">Active</Badge>
        ) : (
          <Badge variant="outline" className="ml-auto">Invited</Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{profile.location}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Joined {profile.created_at ? format(new Date(profile.created_at), 'PP') : 'N/A'}</span>
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Last login: {last_sign_in_at ? format(new Date(last_sign_in_at), 'PPp') : 'Never'}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Orders</CardTitle>
              <CardDescription>{orders.length} order{orders.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">${order.amount} {order.currency}</p>
                      <p className="text-xs text-muted-foreground">{order.created_at ? format(new Date(order.created_at), 'PP') : 'N/A'}</p>
                    </div>
                    <Badge variant={order.status === 'completed' ? 'default' : 'outline'}>{order.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Invoices</CardTitle>
              <CardDescription>{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">${invoice.total_amount} {invoice.currency} &middot; {invoice.issue_date ? format(new Date(invoice.issue_date), 'PP') : 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>{invoice.status}</Badge>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/invoices/${invoice.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Documents</CardTitle>
              <CardDescription>{documents.length} file{documents.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents shared yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.created_at ? format(new Date(doc.created_at), 'PP') : 'N/A'}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Conversations</CardTitle>
              <CardDescription>{conversations.length} conversation{conversations.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    to="/admin/chat"
                    className="flex items-center justify-between p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium">{conv.title || 'Direct Message'}</p>
                    <p className="text-xs text-muted-foreground">
                      {conv.last_message_at ? format(new Date(conv.last_message_at), 'PP') : 'N/A'}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
