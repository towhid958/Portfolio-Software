import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Download, 
  User,
  Loader2,
  AlertCircle,
  Calendar,
  X,
  CheckCircle2,
  FileIcon,
  Shield,
  RefreshCw,
  Edit2,
  Eye,
  Maximize2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';




import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { DocumentUpload } from '@/components/admin/documents/DocumentUpload';
import { format, isSameDay } from 'date-fns';
import { logActivity } from '@/utils/audit';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useRBAC } from '@/hooks/useRBAC';
import { getSecureDownloadUrl } from '@/lib/documents.functions';
import { getPublicSiteConfig } from '@/lib/public-site-config.functions';
import { useServerFn } from '@tanstack/react-start';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';


export const Route = createFileRoute('/admin/documents/')({
  component: AdminDocumentsPage,
});

function AdminDocumentsPage() {
  const { can } = useRBAC();
  const fetchSecureUrl = useServerFn(getSecureDownloadUrl);
  const fetchSiteConfig = useServerFn(getPublicSiteConfig);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Settings > Documents > "Log every download" - this used to log
  // unconditionally regardless of the switch's position.
  const { data: siteConfig } = useQuery({
    queryKey: ['public-site-config'],
    queryFn: () => fetchSiteConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const handleDownload = async (doc: any) => {
    try {
      setDownloadingId(doc.id);
      const { signedUrl } = await fetchSecureUrl({ data: { documentId: doc.id } });

      if (siteConfig?.logDownloads !== false) {
        await logActivity('documents', 'document_download', {
          document_id: doc.id,
          title: doc.title,
          client_id: doc.user_id
        });
      }

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

  const [isAddOpen, setIsAddOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [fileInfo, setFileInfo] = useState<{ size: number; type: string } | null>(null);
  
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);


  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const queryClient = useQueryClient();


  const { data: documents, isLoading } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*, profiles:user_id(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['admin-clients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      if (error) throw error;
      return data;
    }
  });

  const createDocMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !docTitle || !uploadedUrl) {
        throw new Error('Please fill all required fields and upload a file.');
      }

      const { data: newDoc, error } = await supabase.from('client_documents').insert({
        user_id: selectedUser,
        title: docTitle,
        description: docDescription || null,
        file_url: uploadedUrl,
        file_size: fileInfo?.size ?? null,
        file_type: fileInfo?.type ?? null,
        metadata: {
          original_name: docTitle,
          uploaded_by: 'admin',
          timestamp: new Date().toISOString()
        }
      }).select().single();

      if (error) throw error;

      if (newDoc) {
        await logActivity('documents', 'document_provided', { 
          document_id: newDoc.id, 
          title: newDoc.title,
          client_id: selectedUser
        });
      }

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document assigned successfully');
      setIsAddOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const replaceDocMutation = useMutation({
    mutationFn: async ({ id, url, size, type }: { id: string, url: string, size: number, type: string }) => {
      const doc = documents?.find(d => d.id === id);
      if (!doc) throw new Error('Document not found');

      const { data: updatedDoc, error } = await supabase.from('client_documents').update({
        file_url: url,
        file_size: size,
        file_type: type,
        metadata: {
          ...((doc.metadata as any) || {}),
          replaced_at: new Date().toISOString(),
          replaced_by: 'admin',
          previous_url: doc.file_url
        }
      }).eq('id', id).select().single();

      if (error) throw error;

      await logActivity('documents', 'document_replaced', { 
        document_id: id, 
        title: doc.title,
        client_id: doc.user_id,
        new_url: url
      });

      return updatedDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document replaced successfully');
      setIsReplaceOpen(false);
      resetForm();
      setReplacingDocId(null);
    },
    onError: (error: any) => toast.error(error.message)
  });


  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document removed');
    }
  });

  const resetForm = () => {
    setSelectedUser('');
    setDocTitle('');
    setDocDescription('');
    setUploadedUrl('');
    setFileInfo(null);

  };

  const filteredDocs = useMemo(() => {
    return documents?.filter(doc => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.profiles as any)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.profiles as any)?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUser = filterUser === 'all' || doc.user_id === filterUser;
      
      const matchesDate = !filterDate || isSameDay(new Date(doc.created_at), filterDate);
      
      return matchesSearch && matchesUser && matchesDate;
    });
  }, [documents, searchTerm, filterUser, filterDate]);

  const { pageItems: pagedDocs, page, setPage, totalPages, total, pageSize } = usePagination(filteredDocs);

  const handleExport = () => {
    exportToCSV(`documents-${format(new Date(), 'yyyy-MM-dd')}`, (filteredDocs ?? []).map((doc) => ({
      title: doc.title,
      client: (doc.profiles as any)?.full_name || (doc.profiles as any)?.email || '',
      file_type: doc.file_type || '',
      file_size_bytes: doc.file_size || 0,
      created_at: doc.created_at,
    })));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Client Documents</h2>
          <p className="text-muted-foreground">Manage and provide secure documents to your clients.</p>
        </div>
        
        <div className="flex gap-2">
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={(filteredDocs?.length ?? 0) === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        {can('documents', 'create') && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">

            <DialogHeader>
              <DialogTitle>Provide New Document</DialogTitle>
              <CardDescription>Upload a file and assign it to a client vault.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Client</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name || client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Title</label>
                <Input 
                  placeholder="e.g. Project Proposal Q3" 
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea 
                  placeholder="Additional notes for the client..." 
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload File</label>
                {selectedUser ? (
                  <DocumentUpload 
                    userId={selectedUser} 
                    onSuccess={(url, name, size, type) => {
                      setUploadedUrl(url);
                      setFileInfo({ size, type });
                      if (!docTitle) setDocTitle(name);
                    }} 

                  />
                ) : (
                  <div className="p-4 border border-dashed rounded-md text-center text-sm text-muted-foreground">
                    Please select a client first
                  </div>
                )}
                {uploadedUrl && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> File ready to be assigned
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                className="w-full" 
                onClick={() => createDocMutation.mutate()}
                disabled={createDocMutation.isPending || !uploadedUrl}
              >
                {createDocMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Assign to Client'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
        </div>

      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents or clients..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients?.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name || client.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[200px] justify-start text-left font-normal",
                  !filterDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
                {filterDate && (
                  <X 
                    className="ml-auto h-4 w-4 opacity-50 hover:opacity-100" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterDate(undefined);
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {(searchTerm || filterUser !== 'all' || filterDate) && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearchTerm('');
                setFilterUser('all');
                setFilterDate(undefined);
              }}
              className="px-2"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold">Document</th>
                  <th className="px-6 py-4 font-bold">Client</th>
                  <th className="px-6 py-4 font-bold">Type / Size</th>
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>

                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-6 py-4 bg-muted/20 h-16"></td>
                    </tr>
                  ))
                ) : filteredDocs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No documents found.
                    </td>
                  </tr>
                ) : pagedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {doc.title}
                        {(doc.metadata as any)?.uploaded_by === 'client' && (
                          <Badge variant="outline" className="shrink-0 text-[10px] py-0 h-4">
                            Client Upload
                          </Badge>
                        )}
                      </div>
                      {doc.description && <div className="text-xs text-muted-foreground mt-0.5">{doc.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {(doc.profiles as any)?.full_name || (doc.profiles as any)?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[10px] py-0 h-4">
                          {doc.file_type ? doc.file_type.split('/').pop()?.toUpperCase() : 'FILE'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</span>
                        <span className="text-[10px]">{format(new Date(doc.created_at), 'HH:mm')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 text-[10px] py-0 h-4 px-1.5 flex items-center gap-1 w-fit">
                        <Shield className="h-2 w-2" /> Secure
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={async () => {
                          setPreviewDoc(doc);
                          setPreviewUrl(null);
                          setIsPreviewOpen(true);
                          try {
                            const { signedUrl } = await fetchSecureUrl({ data: { documentId: doc.id } });
                            setPreviewUrl(signedUrl);
                          } catch (error: any) {
                            console.error('Preview error:', error);
                            toast.error('Failed to load document preview');
                          }
                        }}
                        title="Preview Document"
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>

                      {can('documents', 'edit') && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setReplacingDocId(doc.id);
                            setSelectedUser(doc.user_id);
                            setIsReplaceOpen(true);
                          }}
                          title="Replace Document"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDownload(doc)}
                        disabled={!can('documents', 'view') || downloadingId === doc.id}
                        title="Download Document"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className={`h-4 w-4 ${!can('documents', 'view') ? 'opacity-20' : ''}`} />
                        )}
                      </Button>




                      {can('documents', 'delete') && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Remove this document from the client vault?')) {
                              deleteDocMutation.mutate(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4">
            <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>
      <Dialog open={isReplaceOpen} onOpenChange={(open) => {
        setIsReplaceOpen(open);
        if (!open) {
          setReplacingDocId(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Document</DialogTitle>
            <CardDescription>
              Upload a new version of this document. The client will see the updated file.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Version</label>
              <DocumentUpload
                userId={selectedUser}
                onSuccess={(url, name, size, type) => {
                  setUploadedUrl(url);
                  setFileInfo({ size, type });
                }}
              />
              {uploadedUrl && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> New version ready
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                if (replacingDocId && uploadedUrl && fileInfo) {
                  replaceDocMutation.mutate({
                    id: replacingDocId,
                    url: uploadedUrl,
                    size: fileInfo.size,
                    type: fileInfo.type
                  });
                }
              }}
              disabled={replaceDocMutation.isPending || !uploadedUrl}
            >
              {replaceDocMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Confirm Replacement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
        setIsPreviewOpen(open);
        if (!open) {
          setPreviewUrl(null);
        }
      }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between w-full pr-8">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {previewDoc?.title}
                </DialogTitle>
                <CardDescription>
                  Client: {previewDoc?.profiles?.full_name || previewDoc?.profiles?.email} • 
                  Uploaded: {previewDoc?.created_at && format(new Date(previewDoc.created_at), 'PPP')}
                </CardDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted/20 relative overflow-hidden">
            {previewUrl ? (
              previewDoc.file_type?.includes('pdf') ? (
                <iframe
                  src={`${previewUrl}#toolbar=0`}
                  className="w-full h-full border-none"
                  title="PDF Preview"
                />
              ) : previewDoc.file_type?.includes('image') ? (
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={previewUrl}
                    alt={previewDoc.title}
                    className="max-w-full max-h-full object-contain shadow-lg rounded-sm"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                  <FileIcon className="h-16 w-16 opacity-20" />
                  <p>Preview not available for this file type.</p>
                  <Button onClick={() => handleDownload(previewDoc)} disabled={downloadingId === previewDoc?.id}>
                    {downloadingId === previewDoc?.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download to View
                  </Button>

                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-muted/5 sm:justify-between items-center">
            <div className="text-xs text-muted-foreground hidden sm:block">
              Type: {previewDoc?.file_type} • 
              Size: {previewDoc?.file_size ? `${(previewDoc.file_size / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownload(previewDoc)} 
                className="flex-1 sm:flex-none"
                disabled={downloadingId === previewDoc?.id}
              >
                {downloadingId === previewDoc?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>

              <Button size="sm" onClick={() => setIsPreviewOpen(false)} className="flex-1 sm:flex-none">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



