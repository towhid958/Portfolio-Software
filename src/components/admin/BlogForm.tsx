import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { MediaPicker } from '@/components/admin/media/MediaPicker';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { SlugField } from '@/components/admin/SlugField';
import { StringListField } from '@/components/admin/StringListField';
import { Save, X } from 'lucide-react';
import { blogPostSchema, type BlogPostValues } from '@/lib/validations';
import { isSlugConflictError } from '@/lib/slug';
import { useState } from 'react';

export function BlogForm({ post }: { post?: any }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<BlogPostValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: post?.title || '',
      slug: post?.slug || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
      category: post?.category || '',
      status: post?.status || 'draft',
      featured_image: post?.featured_image || '',
      tags: Array.isArray(post?.tags) ? post.tags : [],
      seo_title: post?.seo_title || '',
      seo_description: post?.seo_description || '',
    },
  });

  const featuredImage = watch('featured_image');
  const status = watch('status');
  const content = watch('content');
  const title = watch('title');
  const slug = watch('slug');
  const tags = watch('tags');

  const mutation = useMutation({
    mutationFn: async (values: BlogPostValues) => {
      // Convert undefined/nullish to actual null or string as required by the DB
      const dbValues = {
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt ?? null,
        content: values.content,
        category: values.category ?? null,
        status: values.status,
        featured_image: values.featured_image ?? null,
        tags: values.tags ?? [],
        seo_title: values.seo_title ?? null,
        seo_description: values.seo_description ?? null,
        published_at: values.status === 'published' ? (post?.published_at ?? new Date().toISOString()) : null,
      };

      if (post?.id) {
        const { error } = await supabase
          .from('blog_posts')
          .update(dbValues)
          .eq('id', post.id);
        if (error) throw error;
        await logActivity('blog', 'update_post', { id: post.id, title: values.title });
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase
          .from('blog_posts')
          .insert({
            ...dbValues,
            author_id: session?.user.id ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        await logActivity('blog', 'create_post', { id: data.id, title: values.title });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(`Post ${post?.id ? 'updated' : 'created'} successfully`);
      navigate({ to: '/admin/blog' });
    },
    onError: (error: any) => {
      if (isSlugConflictError(error)) {
        toast.error('A post with that title already exists. Please try again.');
        return;
      }
      toast.error(`Operation failed: ${error.message}`);
    }
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          {post?.id ? 'Edit Post' : 'New Blog Post'}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/blog' })}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || slugStatus === 'checking' || slugStatus === 'taken'}>
            <Save className="h-4 w-4 mr-2" /> {isSubmitting ? 'Saving...' : 'Save Post'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register('title')} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1">
                <SlugField
                  table="blog_posts"
                  title={title}
                  value={slug || ''}
                  onChange={(v) => setValue('slug', v, { shouldValidate: true, shouldDirty: true })}
                  excludeId={post?.id}
                  onStatusChange={setSlugStatus}
                  basePath="/blog/"
                />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea id="excerpt" {...register('excerpt')} />
                {errors.excerpt && <p className="text-xs text-destructive">{errors.excerpt.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Body Content</Label>
                <RichTextEditor
                  value={content}
                  onChange={(html) => setValue('content', html, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Write your post..."
                />
                {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input id="seo_title" {...register('seo_title')} />
                {errors.seo_title && <p className="text-xs text-destructive">{errors.seo_title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo_description">SEO Description</Label>
                <Textarea id="seo_description" {...register('seo_description')} />
                {errors.seo_description && <p className="text-xs text-destructive">{errors.seo_description.message}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Featured Image</Label>
                <MediaPicker value={featuredImage ?? null} onChange={(url) => setValue('featured_image', url)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register('category')} placeholder="e.g. Technology, Design" />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
              <StringListField
                label="Tags"
                value={tags || []}
                onChange={(v) => setValue('tags', v)}
                placeholder="e.g. marketing"
              />
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setValue('status', v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
