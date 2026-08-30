import { useState } from 'react';
import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { FieldDef } from '@/lib/builder/fields';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

export interface FormWidgetContent {
  showSubject: boolean;
  showServiceType: boolean;
  showBudgetRange: boolean;
  submitLabel: string;
  successMessage: string;
}

// Deliberately not a generic form builder (arbitrary fields, arbitrary
// storage) - that would need its own admin surface just to view whatever
// got submitted. Instead this maps onto contact_messages, the table
// already backing Admin > Messages (see gigs/$slug.tsx's GigInquiryForm for
// the same insert shape) - a submission here shows up in that existing
// inbox immediately, no new backend needed. Name/email/message are always
// present (contact_messages requires them); subject/service type/budget
// range are optional toggles.
function FormComponent({ content, wiring }: WidgetComponentProps<FormWidgetContent>) {
  const { isEditable } = useBuilderRuntime();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Real submission would leave the editor's preview stuck on the
    // success message for every future edit of this widget - the click
    // still visibly "works" (spinner, then success state) without a
    // network call, matching how other widgets suppress real navigation
    // in the editor (Button, Image's link).
    if (isEditable) {
      setIsSubmitted(true);
      return;
    }
    if (!name || !email || !message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name,
        email,
        message,
        subject: content.showSubject && subject ? subject : null,
        service_type: content.showServiceType && serviceType ? serviceType : null,
        budget_range: content.showBudgetRange && budgetRange ? budgetRange : null,
        status: 'unread',
      });
      if (error) throw error;
      setIsSubmitted(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div {...(wiring as any)} className={cn('builder-el builder-form', wiring.className)}>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p className="builder-el-text">{content.successMessage}</p>
          {isEditable && (
            <Button type="button" variant="link" size="sm" onClick={() => setIsSubmitted(false)}>
              Back to form (preview only)
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form {...(wiring as any)} onSubmit={handleSubmit} className={cn('builder-el builder-form space-y-4', wiring.className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
      </div>
      {content.showSubject && (
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" />
        </div>
      )}
      {(content.showServiceType || content.showBudgetRange) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {content.showServiceType && (
            <div className="space-y-1.5">
              <Label>Service Type</Label>
              <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="e.g. Web Design" />
            </div>
          )}
          {content.showBudgetRange && (
            <div className="space-y-1.5">
              <Label>Budget Range</Label>
              <Input value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} placeholder="e.g. $1,000 - $5,000" />
            </div>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Message</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" rows={5} required />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {content.submitLabel || 'Send Message'}
      </Button>
    </form>
  );
}

const contentFields: FieldDef[] = [
  { key: 'showSubject', label: 'Show Subject Field', control: 'toggle' },
  { key: 'showServiceType', label: 'Show Service Type Field', control: 'toggle' },
  { key: 'showBudgetRange', label: 'Show Budget Range Field', control: 'toggle' },
  { key: 'submitLabel', label: 'Submit Button Text', control: 'text' },
  { key: 'successMessage', label: 'Success Message', control: 'textarea' },
];

registerWidget({
  type: 'form',
  label: 'Contact Form',
  icon: FileText,
  category: 'basic',
  keywords: ['form', 'contact', 'inquiry', 'lead', 'submit'],
  isContainer: false,
  defaultContent: {
    showSubject: true,
    showServiceType: false,
    showBudgetRange: false,
    submitLabel: 'Send Message',
    successMessage: "Thanks for reaching out! We'll get back to you soon.",
  } satisfies FormWidgetContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  Component: FormComponent,
});
