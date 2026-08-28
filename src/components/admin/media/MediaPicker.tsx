import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Search,
  Upload as UploadIcon,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { MediaUpload } from './MediaUpload';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MediaPickerProps {
  value?: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  /** Which kind of asset this picker deals in - filters both the library query and the upload dropzone. Defaults to images (every existing caller). */
  accept?: 'image' | 'video';
}

function MediaThumbnail({ url, isVideo, className }: { url: string; isVideo: boolean; className?: string }) {
  return isVideo ? (
    <video src={url} muted preload="metadata" className={className} />
  ) : (
    <img src={url} alt="" className={className} loading="lazy" />
  );
}

export function MediaPicker({ value, onChange, label, accept = 'image' }: MediaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('library');
  const queryClient = useQueryClient();
  const isVideo = accept === 'video';
  const EmptyIcon = isVideo ? VideoIcon : ImageIcon;

  const { data: media, isLoading } = useQuery({
    queryKey: ['media', accept, search],
    queryFn: async () => {
      let query = supabase
        .from('media')
        .select('*')
        .ilike('file_type', `${accept}/%`)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  const handleSelect = (url: string | null) => {
    onChange(url);
    setIsOpen(false);
  };

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['media', accept] });
    setActiveTab('library');
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}

      {value ? (
        <div className="relative group aspect-video rounded-lg border bg-muted overflow-hidden">
          <MediaThumbnail url={value} isVideo={isVideo} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={() => setIsOpen(true)}>
              Change
            </Button>
            <Button size="sm" variant="destructive" type="button" onClick={() => onChange(null)}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-32 border-dashed flex flex-col gap-2"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <EmptyIcon className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Select or upload {accept}</span>
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Media Library</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b pb-4 px-1">
              <TabsList>
                <TabsTrigger value="library">Library</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>

              {activeTab === 'library' && (
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search media..."
                    className="pl-8 h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              )}
            </div>

            <TabsContent value="library" className="flex-1 mt-0 min-h-0">
              <ScrollArea className="h-[500px] w-full mt-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading assets...</p>
                  </div>
                ) : media?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <EmptyIcon className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium">No {accept}s found</h3>
                    <p className="text-sm text-muted-foreground">Try uploading something or changing your search.</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setActiveTab('upload')}
                    >
                      Upload New
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-1">
                    {media?.map((item) => (
                      <div
                        key={item.id}
                        className={`group relative aspect-square rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all ${
                          value === item.url ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => handleSelect(item.url)}
                      >
                        <MediaThumbnail url={item.url} isVideo={isVideo} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <p className="text-[10px] text-white truncate w-full">{item.name}</p>
                        </div>
                        {value === item.url && (
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <MediaUpload onSuccess={handleUploadSuccess} accept={accept} folder={isVideo ? 'videos' : 'general'} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
