import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, UserCircle, Lock, Twitter, Linkedin, Github } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { MediaPicker } from '@/components/admin/media/MediaPicker';

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
}

export const Route = createFileRoute('/admin/about/')({
  component: AdminAboutPage,
});

function AdminAboutPage() {
  const queryClient = useQueryClient();
  const { can, isLoading: rbacLoading } = useRBAC();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!profile) return;
      const { error } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', profile.id);
      if (error) throw error;
      await logActivity('about', 'update_profile', { full_name: values.full_name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;
    const formData = new FormData(e.currentTarget);
    const values = {
      full_name: formData.get('full_name'),
      professional_title: formData.get('professional_title'),
      bio: formData.get('bio'),
      location: formData.get('location'),
      phone: formData.get('phone'),
      avatar_url: avatarUrl,
      social_links: socialLinks,
    };
    updateMutation.mutate(values);
  };

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>((profile?.social_links as SocialLinks) || {});

  useEffect(() => {
    if (profile?.social_links) {
      setSocialLinks(profile.social_links as SocialLinks);
    }
  }, [profile?.social_links]);

  // Update avatar state when profile loads
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('about', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view about profile content.</p>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-center">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">About Me Content</h2>
        <p className="text-muted-foreground">Manage your personal information and professional bio.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>This information is displayed on your About page.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="w-32">
                <MediaPicker 
                  value={avatarUrl} 
                  onChange={(url) => setAvatarUrl(url || '')} 
                  label="Avatar Photo"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" name="full_name" defaultValue={profile?.full_name || ''} placeholder="Hasan Kamrul" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="professional_title">Professional Title</Label>
                <Input id="professional_title" name="professional_title" defaultValue={profile?.professional_title || ''} placeholder="Digital Strategist & Developer" />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={profile?.location || ''} placeholder="City, Country" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={profile?.phone || ''} placeholder="+1 555 000 0000" />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Social Links</Label>
              <p className="text-xs text-muted-foreground -mt-2">Shown as icons in the site footer. Leave blank to hide an icon.</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="relative">
                  <Twitter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Twitter/X URL"
                    value={socialLinks.twitter || ''}
                    onChange={(e) => setSocialLinks((s) => ({ ...s, twitter: e.target.value }))}
                  />
                </div>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="LinkedIn URL"
                    value={socialLinks.linkedin || ''}
                    onChange={(e) => setSocialLinks((s) => ({ ...s, linkedin: e.target.value }))}
                  />
                </div>
                <div className="relative">
                  <Github className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="GitHub URL"
                    value={socialLinks.github || ''}
                    onChange={(e) => setSocialLinks((s) => ({ ...s, github: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea 
                id="bio" 
                name="bio" 
                defaultValue={profile?.bio || ''} 
                placeholder="Tell your story..." 
                className="min-h-[200px]"
              />
            </div>

            {can('about', 'edit') && (
              <Button type="submit" className="gap-2" disabled={updateMutation.isPending || !profile}>
                <Save className="h-4 w-4" /> 
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
            {!can('about', 'edit') && (
              <p className="text-sm text-muted-foreground italic">You have read-only access to this profile.</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
