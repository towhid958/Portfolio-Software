import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/utils/audit';

interface MediaUploadProps {
  onSuccess: () => void;
  folder?: string;
  /** Which kind of file this dropzone accepts - defaults to images (the original, still the only kind most callers use). */
  accept?: 'image' | 'video';
}

const DROPZONE_ACCEPT = {
  image: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'] },
  video: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov'] },
};
const ACCEPT_HINT = {
  image: 'Supports: JPG, PNG, GIF, WebP, SVG (Max 5MB)',
  video: 'Supports: MP4, WebM, OGG, MOV (Max 100MB)',
};

export function MediaUpload({ onSuccess, folder = 'general', accept = 'image' }: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: DROPZONE_ACCEPT[accept],
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast.error('You must be logged in to upload media');
      setIsUploading(false);
      return;
    }

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        // 3. Get image dimensions if it's an image
        let width = null;
        let height = null;
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve) => {
            img.onload = () => {
              width = img.width;
              height = img.height;
              resolve(null);
            };
          });
        }

        // 4. Save metadata to DB
        const { error: dbError } = await supabase
          .from('media')
          .insert({
            name: file.name,
            url: publicUrl,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            width,
            height,
            folder,
            created_by: session.user.id
          });

        if (dbError) throw dbError;
      }
      
      await logActivity('media', 'upload_assets', { count: files.length, names: files.map(f => f.name) });

      toast.success(`${files.length} file(s) uploaded successfully`);
      setFiles([]);
      onSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {ACCEPT_HINT[accept]}
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{files.length} files selected</h4>
            <Button 
              size="sm" 
              onClick={uploadFiles} 
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : 'Upload All'}
            </Button>
          </div>
          
          <div className="grid gap-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border text-sm">
                <div className="flex items-center gap-2 truncate">
                  <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={isUploading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
