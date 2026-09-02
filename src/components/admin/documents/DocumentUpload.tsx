import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { getPublicSiteConfig } from '@/lib/public-site-config.functions';
import { Button } from '@/components/ui/button';
import { Upload, X, FileIcon, Loader2, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const DEFAULT_MAX_UPLOAD_MB = 25;
const DEFAULT_ALLOWED_TYPES = 'pdf, doc, docx, jpeg, jpg, png';

interface DocumentUploadProps {
  onSuccess: (url: string, name: string, size: number, type: string) => void;

  userId: string;
}

export function DocumentUpload({ onSuccess, userId }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSiteConfig = useServerFn(getPublicSiteConfig);
  // Settings > Documents > "Max upload size (MB)" / "Allowed file types" -
  // previously saved but this component hardcoded its own 10MB limit and
  // fixed type list regardless. Read via the same service-role-backed
  // function the public pages use (not a direct site_configuration query),
  // since this runs for the 'editor' role too and that table's RLS is
  // admin/super_admin only.
  const { data: siteConfig } = useQuery({
    queryKey: ['public-site-config'],
    queryFn: () => fetchSiteConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const maxSizeMb = siteConfig?.maxUploadMb || DEFAULT_MAX_UPLOAD_MB;
  const allowedExtensions = (siteConfig?.allowedFileTypes || DEFAULT_ALLOWED_TYPES)
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean)
    .map((ext) => `.${ext}`);

  const resetState = useCallback(() => {
    setIsUploading(false);
    setFile(null);
    setUploadProgress(0);
    abortControllerRef.current = null;
  }, []);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.info('Upload cancelled');
      resetState();
    }
  }, [resetState]);


  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      const error = fileRejections[0]?.errors[0];
      if (error?.code === 'file-invalid-type') {
        toast.error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}.`);
      } else if (error?.code === 'file-too-large') {
        toast.error(`File is too large. Maximum size is ${maxSizeMb}MB.`);
      } else {
        toast.error('Error selecting file: ' + error?.message);
      }
      return;
    }

    if (acceptedFiles.length > 0 && acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
    }
  }, [allowedExtensions, maxSizeMb]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: maxSizeMb * 1024 * 1024,
    // Keyed on a MIME wildcard rather than real per-extension MIME types -
    // "allowed file types" is configured as a plain extension list
    // (Settings > Documents), not MIME types, and react-dropzone still
    // validates the extension list against the filename either way.
    accept: { '*/*': allowedExtensions },
  });

  const uploadFile = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      setUploadProgress(30);
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents-vault-private')
        .upload(filePath, file);

      if (uploadError) {
        if (controller.signal.aborted) return;
        throw uploadError;
      }

      
      setUploadProgress(70);

      // We only store the relative path (filePath) in the database 
      // instead of a signed URL, to ensure permanent access via server proxy.
      onSuccess(filePath, file.name, file.size, file.type);


      setUploadProgress(100);
      toast.success('File uploaded to vault');
      resetState();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Handled by cancelUpload
        return;
      }
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isUploading ? 'cursor-not-allowed opacity-50 bg-muted/20' : 'cursor-pointer'
        } ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} disabled={isUploading} />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop file here' : 'Click or drag document to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {allowedExtensions.join(', ')} (Max {maxSizeMb}MB)
        </p>
      </div>

      {isUploading && (
        <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading {file?.name}...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <div className="flex justify-end mt-2">
            <Button 
              size="sm" 

              variant="outline" 
              onClick={cancelUpload}
              className="text-xs h-7 gap-1.5"
            >
              <Ban className="h-3 w-3" />
              Cancel Upload
            </Button>
          </div>
        </div>
      )}

      {file && !isUploading && (

        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 border text-sm">
          <div className="flex items-center gap-2 truncate">
            <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{file.name}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setFile(null)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />

            </Button>
            {!isUploading && (
              <Button 
                size="sm"
                onClick={uploadFile}
              >
                Upload
              </Button>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
