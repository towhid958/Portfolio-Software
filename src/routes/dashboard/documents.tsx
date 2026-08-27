import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Clock, Search, History, Info, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

import { format } from 'date-fns';
import { logActivity } from '@/utils/audit';
import { useRBAC } from '@/hooks/useRBAC';
import { getSecureDownloadUrl } from '@/lib/documents.functions';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';


export const Route = createFileRoute('/dashboard/documents')({
  component: ClientDocuments,
});

function ClientDocuments() {
  const { can } = useRBAC();
  const fetchSecureUrl = useServerFn(getSecureDownloadUrl);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (doc: any) => {
    try {
      setDownloadingId(doc.id);
      const { signedUrl } = await fetchSecureUrl({ data: { documentId: doc.id } });
      
      await logActivity('documents', 'client_download', { 
        document_id: doc.id, 
        title: doc.title 
      });

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = signedUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.download = doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to prepare secure download');
    } finally {
      setDownloadingId(null);
    }
  };


  const { data: activityHistory } = useQuery({
    queryKey: ['client-document-activity', selectedDocId],
    enabled: !!selectedDocId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('module', 'documents')
        .filter('details->document_id', 'eq', selectedDocId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  const { data: documents, isLoading } = useQuery({
    queryKey: ['client-documents'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredDocs = documents?.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Document Vault</h1>
        <p className="text-muted-foreground mt-1">Secure access to documents and files provided for your projects.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50"></CardHeader>
              <CardContent className="h-16"></CardContent>
            </Card>
          ))
        ) : filteredDocs?.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No documents yet</h3>
            <p className="text-muted-foreground">Documents shared with you will appear here.</p>
          </div>
        ) : filteredDocs?.map(doc => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <Dialog onOpenChange={(open) => open && setSelectedDocId(doc.id)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="View Activity">
                        <History className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <History className="h-5 w-5" />
                          Activity History
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">{doc.title}</p>
                      </DialogHeader>
                      <ScrollArea className="h-[300px] mt-4 pr-4">
                        <div className="space-y-4">
                          {activityHistory?.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground text-sm">No activity recorded yet.</p>
                          ) : (
                            activityHistory?.map((log) => (
                              <div key={log.id} className="border-l-2 border-primary/20 pl-4 py-1 relative">
                                <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-primary" />
                                <p className="text-sm font-medium capitalize">
                                  {log.action.replace('_', ' ')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(log.created_at!), 'MMM dd, yyyy HH:mm')}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDownload(doc)}
                    disabled={!can('documents', 'view') || downloadingId === doc.id}
                  >
                    {downloadingId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className={`h-4 w-4 ${!can('documents', 'view') ? 'opacity-20' : ''}`} />
                    )}
                  </Button>


                </div>

              </div>
              <CardTitle className="mt-4 line-clamp-1">{doc.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {doc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{doc.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                  <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                  {doc.file_size && (
                    <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                      <Info className="h-3 w-3" />
                      <span>{formatFileSize(doc.file_size)}</span>
                    </div>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
