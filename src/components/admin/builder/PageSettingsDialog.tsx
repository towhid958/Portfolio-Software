import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SlugField } from '@/components/admin/SlugField';
import { MediaControl } from '@/components/builder/controls/MediaControl';

interface PageSettingsDialogProps {
  title: string;
  slug: string;
  onSlugChange: (slug: string) => void;
  onSlugStatusChange: (status: 'idle' | 'checking' | 'available' | 'taken' | 'error') => void;
  excludeId?: string | undefined;
  seoTitle: string;
  onSeoTitleChange: (v: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (v: string) => void;
  ogImage: string;
  onOgImageChange: (v: string) => void;
}

export function PageSettingsDialog({
  title,
  slug,
  onSlugChange,
  onSlugStatusChange,
  excludeId,
  seoTitle,
  onSeoTitleChange,
  seoDescription,
  onSeoDescriptionChange,
  ogImage,
  onOgImageChange,
}: PageSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="Page Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Page Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <SlugField
            table="pages"
            title={title}
            value={slug}
            onChange={onSlugChange}
            onStatusChange={onSlugStatusChange}
            excludeId={excludeId}
            basePath="/"
          />

          <div className="space-y-2">
            <Label htmlFor="page-seo-title">SEO Title</Label>
            <Input
              id="page-seo-title"
              value={seoTitle}
              placeholder={title}
              onChange={(e) => onSeoTitleChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-seo-description">SEO Description</Label>
            <Textarea
              id="page-seo-description"
              value={seoDescription}
              onChange={(e) => onSeoDescriptionChange(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="space-y-2">
            <Label>Social Share Image</Label>
            <MediaControl value={ogImage} onChange={(v) => onOgImageChange(v ?? '')} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
