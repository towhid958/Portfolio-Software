import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoiceTemplates, updateInvoiceTemplate } from '@/lib/invoice-templates.functions';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Mail, Code, Info } from 'lucide-react';

export const Route = createFileRoute('/admin/settings/email-templates')({
  component: EmailTemplatesPage,
});

function EmailTemplatesPage() {
  const fetchInvoiceTemplates = useServerFn(getInvoiceTemplates);
  const updateInvoiceTemplateFn = useServerFn(updateInvoiceTemplate);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['invoice-templates'],
    queryFn: () => fetchInvoiceTemplates(),
  });

  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (variables: { id: string; subject: string; html_template: string }) =>
      updateInvoiceTemplateFn({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(undefined);
  const activeTemplate = (templates ?? []).find((t) => t.id === activeTemplateId);

  const [subject, setSubject] = useState(activeTemplate?.subject || '');
  const [htmlTemplate, setHtmlTemplate] = useState(activeTemplate?.html_template || '');

  // Seed the active template once the list has loaded.
  useEffect(() => {
    if (!templates || templates.length === 0 || activeTemplateId) return;
    const first = templates[0];
    if (!first) return;
    setActiveTemplateId(first.id);
    setSubject(first.subject || '');
    setHtmlTemplate(first.html_template || '');
  }, [templates, activeTemplateId]);

  // Update local state when switching templates
  const handleTemplateChange = (id: string) => {
    setActiveTemplateId(id);
    const template = (templates ?? []).find((t) => t.id === id);
    setSubject(template?.subject || '');
    setHtmlTemplate(template?.html_template || '');
  };

  const handleSave = () => {
    if (!activeTemplateId) return;
    updateMutation.mutate({
      id: activeTemplateId as string,
      subject,
      html_template: htmlTemplate,
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Templates</h2>
          <p className="text-muted-foreground">Manage invoice and payment notification emails.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Notification Types</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex flex-col gap-1">
              {(templates ?? []).map((t) => (
                <Button
                  key={t.id}
                  variant={activeTemplateId === t.id ? "secondary" : "ghost"}
                  className="justify-start font-normal"
                  onClick={() => handleTemplateChange(t.id)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {t.type.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{activeTemplate?.type.replace(/_/g, ' ')}</CardTitle>
                <CardDescription>Customize the subject and HTML body.</CardDescription>
              </div>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">
                  <Code className="mr-2 h-4 w-4" />
                  Editor
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Mail className="mr-2 h-4 w-4" />
                  Live Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Invoice {{invoice_number}}"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="html">HTML Template</Label>
                  <Textarea
                    id="html"
                    className="min-h-[400px] font-mono text-xs"
                    value={htmlTemplate}
                    onChange={(e) => setHtmlTemplate(e.target.value)}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Available Placeholders</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      '{{invoice_number}}',
                      '{{amount}}',
                      '{{currency}}',
                      '{{customer_name}}',
                      '{{due_date}}',
                      '{{invoice_url}}'
                    ].map(p => (
                      <code key={p} className="text-[10px] bg-background px-2 py-1 rounded border">
                        {p}
                      </code>
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="preview" className="pt-4 border rounded-md mt-4 p-0 overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b text-xs text-muted-foreground">
                  <strong>Subject:</strong> {subject.replace(/{{invoice_number}}/g, 'INV-2026-001')}
                </div>
                <div 
                  className="p-4 bg-white min-h-[400px]"
                  dangerouslySetInnerHTML={{ 
                    __html: htmlTemplate
                      .replace(/{{customer_name}}/g, 'John Doe')
                      .replace(/{{invoice_number}}/g, 'INV-2026-001')
                      .replace(/{{amount}}/g, '250.00')
                      .replace(/{{currency}}/g, 'USD')
                      .replace(/{{due_date}}/g, '2026-09-01')
                      .replace(/{{invoice_url}}/g, '#')
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
