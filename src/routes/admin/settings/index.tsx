import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Save, 
  Globe, 
  Shield, 
  Bell, 
  Lock, 
  Building, 
  User, 
  CreditCard, 
  Zap, 
  FileText, 
  Mail, 
  Settings as SettingsIcon,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { useState } from 'react';
import { getSiteConfiguration, updateSiteConfiguration, getPortalSettings, updatePortalSetting } from '@/lib/settings.functions';
import { getSystemStatus } from '@/lib/system-status.functions';
import { useServerFn } from '@tanstack/react-start';

export const Route = createFileRoute('/admin/settings/')({
  component: SettingsPage,
});

function SettingsPage() {
  const { roles, userEmail, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();
  const fetchConfig = useServerFn(getSiteConfiguration);
  const saveConfig = useServerFn(updateSiteConfiguration);
  const fetchPortalSettings = useServerFn(getPortalSettings);
  const savePortalSetting = useServerFn(updatePortalSetting);
  const fetchSystemStatus = useServerFn(getSystemStatus);

  const [activeTab, setActiveTab] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = roles.includes('super_admin');

  const { data: config, isLoading: configLoading, dataUpdatedAt: configUpdatedAt } = useQuery({
    queryKey: ['admin-expanded-settings'],
    queryFn: () => fetchConfig(),
  });

  const { data: portalSettings, isLoading: portalLoading } = useQuery({
    queryKey: ['admin-portal-settings'],
    queryFn: () => fetchPortalSettings(),
  });

  const { data: systemStatus, isError: systemStatusError } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => fetchSystemStatus(),
    staleTime: 60_000,
    retry: 1,
  });

  const updateConfigMutation = useMutation({
    mutationFn: (variables: { key: string; value: any; category: string }) => saveConfig({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expanded-settings'] });
      toast.success('Setting updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updatePortalMutation = useMutation({
    mutationFn: (variables: { feature_key: string; is_enabled: boolean; access_level: string }) => 
      savePortalSetting({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-portal-settings'] });
      toast.success('Portal feature updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only Super Admins can access system settings.</p>
      </div>
    );
  }

  const menuItems = [
    { id: 'general', label: 'General', icon: Building, description: 'Branding & Identity' },
    { id: 'account', label: 'Account', icon: User, description: 'Profile & Security' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email & Alerts' },
    { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Payments & Invoices' },
    { id: 'portal', label: 'Client Portal', icon: Globe, description: 'Portal Access' },
    { id: 'integrations', label: 'Integrations', icon: Zap, description: 'Connected Services' },
    { id: 'documents', label: 'Documents', icon: FileText, description: 'File Preferences' },
    { id: 'security', label: 'Compliance', icon: Shield, description: 'Audits & Policies' },
    { id: 'system', label: 'System', icon: SettingsIcon, description: 'Advanced Settings' },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (configLoading || portalLoading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">Configure global preferences and platform behavior.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
          systemStatusError || (systemStatus && !systemStatus.database) ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
        }`}>
          {systemStatusError || (systemStatus && !systemStatus.database) ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {systemStatusError ? 'Database Unreachable' : systemStatus === undefined ? 'Checking Database...' : systemStatus.database ? 'Database Connected' : 'Database Unreachable'}
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Left Side Navigation */}
        <div className="w-64 shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search settings..." 
              className="pl-8 h-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[calc(100vh-250px)]">
            <nav className="space-y-1">
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${
                    activeTab === item.id 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className={`h-5 w-5 mt-0.5 ${activeTab === item.id ? '' : 'text-primary/70'}`} />
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className={`text-[10px] leading-tight ${activeTab === item.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </ScrollArea>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 space-y-6">
          <Card className="min-h-[500px]">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="capitalize">{activeTab} Settings</CardTitle>
                  <CardDescription>
                    {menuItems.find(i => i.id === activeTab)?.description}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-expanded-settings'] })}>
                  Reset Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6" key={configUpdatedAt}>
              {activeTab === 'general' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Business Identity</h3>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Business Name</Label>
                        <Input 
                          defaultValue={config?.business_name || 'Hasan Kamrul Portfolio'} 
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'business_name', value: e.target.value, category: 'general' })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Public Email</Label>
                          <Input 
                            defaultValue={config?.public_email || ''} 
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'public_email', value: e.target.value, category: 'general' })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Contact Phone</Label>
                          <Input 
                            defaultValue={config?.contact_phone || ''} 
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'contact_phone', value: e.target.value, category: 'general' })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Global Scheduling Link (Calendly/SavvyCal)</Label>
                        <Input 
                          placeholder="https://calendly.com/your-profile"
                          defaultValue={config?.scheduling_url || ''} 
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'scheduling_url', value: e.target.value, category: 'general' })}
                        />
                        <p className="text-[10px] text-muted-foreground">This link will be shown to leads after they submit a quote request.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Business Address</Label>
                        <Textarea 
                          defaultValue={config?.business_address || ''} 
                          onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => updateConfigMutation.mutate({ key: 'business_address', value: e.target.value, category: 'general' })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Localization</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Input defaultValue="UTC (Universal Time)" disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Input 
                          defaultValue={config?.currency || 'USD'} 
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'currency', value: e.target.value, category: 'general' })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'portal' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold">Client Portal Control</p>
                      <p>Enable or disable specific features for your clients. Changes take effect immediately upon saving.</p>
                    </div>
                  </div>

                  <div className="rounded-md border divide-y">
                    {portalSettings?.map((feature: any) => (
                      <div key={feature.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <Label className="text-base capitalize">{feature.feature_key}</Label>
                          <p className="text-sm text-muted-foreground">
                            Control client access to {feature.feature_key} module.
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Status:</span>
                            <Switch 
                              checked={feature.is_enabled}
                              onCheckedChange={(checked) => updatePortalMutation.mutate({ 
                                feature_key: feature.feature_key, 
                                is_enabled: checked,
                                access_level: feature.access_level
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Portal Branding</h3>
                    <div className="grid gap-4 max-w-md">
                      <div className="space-y-2">
                        <Label>Portal Custom Title</Label>
                        <Input 
                          placeholder="e.g. Hasan Kamrul | Client Center"
                          defaultValue={config?.portal_title || ''}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'portal_title', value: e.target.value, category: 'portal' })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">System Email</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <Label>Welcome Emails</Label>
                          <p className="text-sm text-muted-foreground">Send welcome email to new clients.</p>
                        </div>
                        <Switch 
                          checked={!!config?.send_welcome_email}
                          onCheckedChange={(checked) => updateConfigMutation.mutate({ key: 'send_welcome_email', value: checked, category: 'notifications' })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <Label>Order Notifications</Label>
                          <p className="text-sm text-muted-foreground">Notify me via email for new orders.</p>
                        </div>
                        <Switch 
                          checked={!!config?.notify_orders}
                          onCheckedChange={(checked) => updateConfigMutation.mutate({ key: 'notify_orders', value: checked, category: 'notifications' })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Signed-in Account</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={userEmail || ''} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Roles</Label>
                        <Input value={roles.join(', ') || 'user'} disabled className="capitalize" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        defaultValue={config?.admin_display_name || ''}
                        placeholder="Hasan Kamrul"
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'admin_display_name', value: e.target.value, category: 'account' })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Reply-To Address</Label>
                      <Input
                        defaultValue={config?.support_reply_to || ''}
                        placeholder="support@yourdomain.com"
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'support_reply_to', value: e.target.value, category: 'account' })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Session Security</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Require email verification</Label>
                        <p className="text-sm text-muted-foreground">Block portal access until the address is confirmed.</p>
                      </div>
                      <Switch
                        checked={config?.require_email_verification !== false}
                        onCheckedChange={(checked) => updateConfigMutation.mutate({ key: 'require_email_verification', value: checked, category: 'account' })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Session timeout (hours)</Label>
                      <Input
                        type="number"
                        min={1}
                        defaultValue={config?.session_timeout_hours || 24}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'session_timeout_hours', value: Number(e.target.value), category: 'account' })}
                      />
                    </div>
                    <Button variant="outline" onClick={() => supabase.auth.resetPasswordForEmail(userEmail || '', { redirectTo: `${window.location.origin}/auth/reset-password` }).then(() => toast.success('Password reset email sent'))}>
                      Send myself a password reset link
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Invoicing</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Invoice Prefix</Label>
                        <Input
                          defaultValue={config?.invoice_prefix || 'INV-'}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'invoice_prefix', value: e.target.value, category: 'billing' })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Default Payment Terms (days)</Label>
                        <Input
                          type="number"
                          min={0}
                          defaultValue={config?.payment_terms_days || 14}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'payment_terms_days', value: Number(e.target.value), category: 'billing' })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tax / VAT rate (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={config?.tax_rate || 0}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'tax_rate', value: Number(e.target.value), category: 'billing' })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Late fee (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={config?.late_fee || 0}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'late_fee', value: Number(e.target.value), category: 'billing' })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Footer Note</Label>
                      <Textarea
                        placeholder="Thank you for your business."
                        defaultValue={config?.invoice_footer || ''}
                        onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => updateConfigMutation.mutate({ key: 'invoice_footer', value: e.target.value, category: 'billing' })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Payment Methods</h3>
                    {[
                      { key: 'payment_stripe', label: 'Stripe (cards, global clients)' },
                      { key: 'payment_bkash', label: 'bKash (Bangladesh)' },
                      { key: 'payment_bank', label: 'Manual bank transfer' },
                    ].map((m) => (
                      <div key={m.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <Label className="text-base">{m.label}</Label>
                        <Switch
                          checked={config?.[m.key] !== false}
                          onCheckedChange={(checked) => updateConfigMutation.mutate({ key: m.key, value: checked, category: 'billing' })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Connected Services</h3>
                    <div className="rounded-md border divide-y">
                      {[
                        { key: 'integration_stripe', name: 'Stripe', desc: 'Card payments and checkout sessions', connected: systemStatus?.stripeConfigured },
                        { key: 'integration_resend', name: 'Resend', desc: 'Transactional invoice and notification emails', connected: systemStatus?.resendConfigured },
                        { key: 'integration_cloud', name: 'Supabase', desc: 'Database, auth, storage and server functions', connected: systemStatus?.database },
                      ].map((i) => (
                        <div key={i.key} className="p-4 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base">{i.name}</Label>
                            <p className="text-sm text-muted-foreground">{i.desc}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold ${
                              systemStatusError ? 'text-destructive' : systemStatus === undefined ? 'text-muted-foreground' : i.connected ? 'text-green-600' : 'text-destructive'
                            }`}>
                              {systemStatusError ? 'Unable to check' : systemStatus === undefined ? 'Checking...' : i.connected ? 'Connected' : 'Not configured'}
                            </span>
                            <Switch
                              checked={config?.[i.key] !== false}
                              onCheckedChange={(checked) => updateConfigMutation.mutate({ key: i.key, value: checked, category: 'integrations' })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Analytics & Webhooks</h3>
                    <div className="space-y-2">
                      <Label>Google Analytics Measurement ID</Label>
                      <Input
                        placeholder="G-XXXXXXXXXX"
                        defaultValue={config?.ga_measurement_id || ''}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'ga_measurement_id', value: e.target.value, category: 'integrations' })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Outbound Webhook URL</Label>
                      <Input
                        placeholder="https://hooks.example.com/endpoint"
                        defaultValue={config?.outbound_webhook_url || ''}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'outbound_webhook_url', value: e.target.value, category: 'integrations' })}
                      />
                      <p className="text-[10px] text-muted-foreground">Order and invoice events are posted to this URL.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Vault Preferences</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Max upload size (MB)</Label>
                        <Input
                          type="number"
                          min={1}
                          defaultValue={config?.max_upload_mb || 25}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'max_upload_mb', value: Number(e.target.value), category: 'documents' })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Signed link lifetime (minutes)</Label>
                        <Input
                          type="number"
                          min={1}
                          defaultValue={config?.signed_link_minutes || 5}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'signed_link_minutes', value: Number(e.target.value), category: 'documents' })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Allowed file types</Label>
                      <Input
                        placeholder="pdf, png, jpg, docx, xlsx, zip"
                        defaultValue={config?.allowed_file_types || 'pdf, png, jpg, docx, xlsx, zip'}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'allowed_file_types', value: e.target.value, category: 'documents' })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    {[
                      { key: 'docs_client_upload', label: 'Allow client uploads', desc: 'Clients can add files to their own vault.' },
                      { key: 'docs_notify_on_upload', label: 'Notify client on new document', desc: 'Send an email when a file is shared.' },
                      { key: 'docs_log_downloads', label: 'Log every download', desc: 'Record downloads in the audit trail.' },
                    ].map((d) => (
                      <div key={d.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <Label className="text-base">{d.label}</Label>
                          <p className="text-sm text-muted-foreground">{d.desc}</p>
                        </div>
                        <Switch
                          checked={config?.[d.key] !== false}
                          onCheckedChange={(checked) => updateConfigMutation.mutate({ key: d.key, value: checked, category: 'documents' })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Password Policy</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Minimum length</Label>
                        <Input
                          type="number"
                          min={6}
                          defaultValue={config?.password_min_length || 8}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'password_min_length', value: Number(e.target.value), category: 'security' })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Audit log retention (days)</Label>
                        <Input
                          type="number"
                          min={30}
                          defaultValue={config?.audit_retention_days || 365}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'audit_retention_days', value: Number(e.target.value), category: 'security' })}
                        />
                      </div>
                    </div>
                    {[
                      { key: 'password_require_symbol', label: 'Require a symbol and a number' },
                      { key: 'security_track_ip', label: 'Record IP address on sensitive actions' },
                      { key: 'security_alert_admin_login', label: 'Alert me on new admin sign-ins' },
                    ].map((s) => (
                      <div key={s.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <Label className="text-base">{s.label}</Label>
                        <Switch
                          checked={config?.[s.key] !== false}
                          onCheckedChange={(checked) => updateConfigMutation.mutate({ key: s.key, value: checked, category: 'security' })}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Compliance</h3>
                    <div className="space-y-2">
                      <Label>Privacy Policy URL</Label>
                      <Input
                        placeholder="https://yourdomain.com/privacy"
                        defaultValue={config?.privacy_policy_url || ''}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'privacy_policy_url', value: e.target.value, category: 'security' })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data retention notice</Label>
                      <Textarea
                        placeholder="Client data is retained for the duration of the engagement plus 12 months."
                        defaultValue={config?.data_retention_notice || ''}
                        onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => updateConfigMutation.mutate({ key: 'data_retention_notice', value: e.target.value, category: 'security' })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Availability</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Maintenance mode</Label>
                        <p className="text-sm text-muted-foreground">Show a maintenance notice to public visitors.</p>
                      </div>
                      <Switch
                        checked={!!config?.maintenance_mode}
                        onCheckedChange={(checked) => updateConfigMutation.mutate({ key: 'maintenance_mode', value: checked, category: 'system' })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maintenance message</Label>
                      <Textarea
                        placeholder="We'll be back shortly."
                        defaultValue={config?.maintenance_message || ''}
                        onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => updateConfigMutation.mutate({ key: 'maintenance_message', value: e.target.value, category: 'system' })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Diagnostics</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Database</div>
                        <div className={`text-sm font-semibold ${
                          systemStatusError || (systemStatus && !systemStatus.database) ? 'text-destructive' : systemStatus === undefined ? 'text-muted-foreground' : 'text-green-600'
                        }`}>
                          {systemStatusError ? 'Unable to check' : systemStatus === undefined ? 'Checking...' : systemStatus.database ? 'Healthy' : 'Unreachable'}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Storage</div>
                        <div className={`text-sm font-semibold ${
                          systemStatusError || (systemStatus && !systemStatus.storage) ? 'text-destructive' : systemStatus === undefined ? 'text-muted-foreground' : 'text-green-600'
                        }`}>
                          {systemStatusError ? 'Unable to check' : systemStatus === undefined ? 'Checking...' : systemStatus.storage ? 'Operational' : 'Unreachable'}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Config keys</div>
                        <div className="text-sm font-semibold">{Object.keys(config || {}).length}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'site-configuration.json';
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Configuration exported');
                        }}
                      >
                        Export configuration (JSON)
                      </Button>
                      <Button variant="outline" onClick={() => { queryClient.invalidateQueries(); toast.success('Caches cleared'); }}>
                        Clear application cache
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
