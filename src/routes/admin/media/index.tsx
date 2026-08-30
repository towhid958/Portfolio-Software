import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Upload,
  Grid,
  List,
  Trash2,
  Copy,
  ExternalLink,
  MoreVertical,
  Download,
  FileIcon,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MediaUpload } from '@/components/admin/media/MediaUpload';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';
import { format } from 'date-fns';

export const Route = createFileRoute('/admin/media/')({
  component: MediaLibraryPage,
});

function MediaLibraryPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const queryClient = useQueryClient();
  const { can, isLoading: rbacLoading } = useRBAC();

  const { data: media, isLoading } = useQuery({
    queryKey: ['media-library', search],
    queryFn: async () => {
      let query = supabase.from('media').select('*').order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: any) => {
      // 1. Delete from Storage
      const { error: storageError } = await supabase.storage.from('media').remove([item.file_path]);

      if (storageError) throw storageError;

      // 2. Delete from DB
      const { error: dbError } = await supabase.from('media').delete().eq('id', item.id);

      if (dbError) throw dbError;
      await logActivity('media', 'delete_asset', { id: item.id, name: item.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      toast.success('Media deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const [typeFilter, setTypeFilter] = useState('all');

  const filteredMedia = (media ?? []).filter((item) => {
    if (typeFilter === 'all') return true;
    if (typeFilter === 'image') return item.file_type?.startsWith('image/');
    return !item.file_type?.startsWith('image/');
  });

  const {
    pageItems: pagedMedia,
    page,
    setPage,
    totalPages,
    total,
    pageSize,
  } = usePagination(filteredMedia, 24);

  const handleExport = () => {
    exportToCSV(
      `media-${format(new Date(), 'yyyy-MM-dd')}`,
      filteredMedia.map((item) => ({
        name: item.name,
        type: item.file_type || '',
        size_bytes: item.file_size || 0,
        created_at: item.created_at,
        url: item.url,
      })),
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('media', 'view')) {
    return <div className="p-8 text-center">Access Denied</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Media Library</h2>
          <p className="text-muted-foreground">Manage and organize your assets.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={filteredMedia.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Upload Media</DialogTitle>
              </DialogHeader>
              <MediaUpload
                onSuccess={() => {
                  setIsUploadOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['media-library'] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="other">Other Files</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
              <Button
                variant={view === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading library...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderOpen className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-xl font-medium">No media found</h3>
              <p className="text-muted-foreground">
                Try uploading your first asset or changing your search.
              </p>
            </div>
          ) : (
            <>
              {view === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {pagedMedia.map((item) => (
                    <div key={item.id} className="group relative flex flex-col gap-2">
                      <div className="relative aspect-square rounded-lg border bg-muted overflow-hidden group-hover:ring-2 group-hover:ring-primary transition-all">
                        {item.file_type?.startsWith('image/') ? (
                          <img
                            src={item.url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <FileIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(item.url)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="secondary" className="h-8 w-8" asChild>
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          {can('media', 'delete') && (
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this asset?')) {
                                  deleteMutation.mutate(item);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="px-1">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatSize(item.file_size || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="p-4 font-medium">Preview</th>
                        <th className="p-4 font-medium">Name</th>
                        <th className="p-4 font-medium">Type</th>
                        <th className="p-4 font-medium">Size</th>
                        <th className="p-4 font-medium">Dimensions</th>
                        <th className="p-4 font-medium">Created At</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedMedia.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-4">
                            <div className="h-12 w-12 rounded border bg-muted overflow-hidden">
                              {item.file_type?.startsWith('image/') ? (
                                <img src={item.url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-medium max-w-[200px] truncate">{item.name}</td>
                          <td className="p-4 text-muted-foreground">{item.file_type}</td>
                          <td className="p-4 text-muted-foreground">
                            {formatSize(item.file_size || 0)}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {item.width && item.height ? `${item.width} × ${item.height}` : '-'}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(item.created_at || '').toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copyToClipboard(item.url)}>
                                  <Copy className="h-4 w-4 mr-2" /> Copy URL
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" /> View Original
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={item.url} download={item.name}>
                                    <Download className="h-4 w-4 mr-2" /> Download
                                  </a>
                                </DropdownMenuItem>
                                {can('media', 'delete') && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      if (confirm('Are you sure?')) {
                                        deleteMutation.mutate(item);
                                      }
                                    }}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <ListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
