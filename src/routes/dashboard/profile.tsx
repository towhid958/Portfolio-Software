import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Save } from 'lucide-react';

export const Route = createFileRoute('/dashboard/profile')({
  component: ClientProfile,
});

function ClientProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [savingPreference, setSavingPreference] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
  });

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);

      // Read from public.profiles (not auth user_metadata) - that's the row
      // admin's Client Detail page and Clients list actually display, so
      // saving anywhere else means a client's own edits never show up there.
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, location, email_notifications')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Failed to load profile:', error);
        return;
      }

      setProfile({
        full_name: data.full_name ?? '',
        email: data.email ?? session.user.email ?? '',
        phone: data.phone ?? '',
        location: data.location ?? '',
      });
      setEmailNotifications(data.email_notifications ?? true);
    }
    getProfile();
  }, []);

  const handleEmailNotificationsChange = async (checked: boolean) => {
    if (!userId) return;
    setEmailNotifications(checked);
    setSavingPreference(true);
    try {
      const { error } = await supabase.from('profiles').update({ email_notifications: checked }).eq('id', userId);
      if (error) throw error;
      toast.success(checked ? 'Automatic email notifications enabled' : 'Automatic email notifications disabled');
    } catch (error: any) {
      setEmailNotifications(!checked);
      toast.error(error.message || 'Failed to update preference');
    } finally {
      setSavingPreference(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile.email) return;
    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset link sent! Please check your email.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name || null,
          phone: profile.phone || null,
          location: profile.location || null,
        })
        .eq('id', userId);
      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details. Your project team can see this too.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" value={profile.email} disabled className="pl-9 bg-muted" />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed manually.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  className="pl-9"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className="pl-9"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  className="pl-9"
                  placeholder="Optional"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Control automatic emails about your orders and invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Automatic payment emails</Label>
              <p className="text-sm text-muted-foreground">
                Payment confirmation and payment failed emails sent automatically after checkout.
                In-app notifications and emails you request yourself (like "Email Invoice") are unaffected.
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={handleEmailNotificationsChange}
              disabled={savingPreference || !userId}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Security</CardTitle>
          <CardDescription>Sensitive account actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={handlePasswordReset}
            disabled={resettingPassword || !profile.email}
          >
            {resettingPassword ? 'Sending...' : 'Request Password Reset'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
