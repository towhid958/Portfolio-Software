import { createFileRoute, Link } from '@tanstack/react-router';
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
    { id: 'billing', label: 'Billing', icon: CreditCard, description: 'See Invoices' },
    { id: 'portal', label: 'Client Portal', icon: Globe, description: 'Portal Access' },
    { id: 'integrations', label: 'Integrations', icon: Zap, description: 'Connected Services' },
    { id: 'documents', label: 'Documents', icon: FileText, description: 'File Preferences' },
    { id: 'security', label: 'Compliance', icon: Shield, description: 'Privacy Policy Link' },
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
                    <p className="text-xs text-muted-foreground">
                      Company name/email/address used specifically on invoices lives under Invoices &rarr; Branding &amp; Rules instead - the fields below are shown on the public site itself (footer contact info).
                    </p>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Public Email</Label>
                          <Input
                            defaultValue={config?.public_email || ''}
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'public_email', value: e.target.value, category: 'general' })}
                          />
                          <p className="text-[10px] text-muted-foreground">Shown in the public site footer.</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Contact Phone</Label>
                          <Input
                            defaultValue={config?.contact_phone || ''}
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'contact_phone', value: e.target.value, category: 'general' })}
                          />
                          <p className="text-[10px] text-muted-foreground">Shown in the public site footer, if set.</p>
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
                        <p className="text-[10px] text-muted-foreground">Shown in the public site footer, if set.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Localization</h3>
                    <div className="grid grid-cols-2 gap-4">
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
                    <Button variant="outline" onClick={() => supabase.auth.resetPasswordForEmail(userEmail || '', { redirectTo: `${window.location.origin}/auth/reset-password` }).then(() => toast.success('Password reset email sent'))}>
                      Send myself a password reset link
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-4 max-w-2xl">
                  {/* This tab used to duplicate invoice_prefix/payment-terms/tax-rate/
                      late-fee/footer/payment-method fields that were saved here but
                      never actually read by invoice generation - the real, working
                      versions (company identity, invoice prefix, per-line-item tax)
                      live on the Invoices page instead. */}
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800 space-y-2">
                      <p className="font-semibold">Billing settings moved</p>
                      <p>
                        Invoice prefix, company name/email/address on invoices, and per-line-item pricing all live under{' '}
                        <span className="font-medium">Invoices &rarr; Branding &amp; Rules</span> now, where they're actually
                        used to generate real invoices - not here.
                      </p>
                      <Link to="/admin/invoices" className="inline-flex items-center gap-1 font-medium underline">
                        Go to Invoices
                      </Link>
                    </div>
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
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Status reflects whether each service's credentials are actually configured on the server - there's no
                      separate on/off switch, since disabling one here couldn't stop the app code that already calls it directly.
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Analytics</h3>
                    <div className="space-y-2">
                      <Label>Google Analytics Measurement ID</Label>
                      <Input
                        placeholder="G-XXXXXXXXXX"
                        defaultValue={config?.ga_measurement_id || ''}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'ga_measurement_id', value: e.target.value, category: 'integrations' })}
                      />
                      <p className="text-[10px] text-muted-foreground">Injects the GA tag site-wide once set.</p>
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
                    <h3 className="text-lg font-semibold">Compliance</h3>
                    <div className="space-y-2">
                      <Label>Privacy Policy URL</Label>
                      <Input
                        placeholder="https://yourdomain.com/privacy"
                        defaultValue={config?.privacy_policy_url || ''}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateConfigMutation.mutate({ key: 'privacy_policy_url', value: e.target.value, category: 'security' })}
                      />
                      <p className="text-[10px] text-muted-foreground">Used for the "Privacy Policy" link in the public site footer, once set.</p>
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
