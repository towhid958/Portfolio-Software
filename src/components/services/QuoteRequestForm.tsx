import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  quoteRequestSchema,
  type QuoteRequestValues,
  type QuoteRequestFormValues,
} from '@/lib/validations';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, ChevronRight, ChevronLeft, Send, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSiteConfiguration, configString } from '@/lib/settings.functions';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { submitServiceInquiry } from '@/lib/services.functions';

interface QuoteRequestFormProps {
  serviceId?: string | undefined;
  serviceTitle: string;
}

export function QuoteRequestForm({ serviceId, serviceTitle }: QuoteRequestFormProps) {
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  const fetchConfig = useServerFn(getSiteConfiguration);
  const submitInquiry = useServerFn(submitServiceInquiry);

  const { data: config } = useQuery({
    queryKey: ['site-config'],
    queryFn: () => fetchConfig(),
  });

  const form = useForm<QuoteRequestFormValues, unknown, QuoteRequestValues>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      client_name: '',
      client_email: '',
      project_description: '',
      custom_answers: {},
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    setFocus,
  } = form;

  const mutation = useMutation({
    mutationFn: async (values: QuoteRequestValues) => {
      const result = await submitInquiry({
        data: {
          ...values,
          serviceId,
        },
      });
      return result;
    },
    onSuccess: (result) => {
      setIsSuccess(true);
      setQuoteId(result.id);
      toast.success('Quote request sent successfully!');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to send quote request'));
    },
  });

  const nextStep = async () => {
    let fields: (keyof QuoteRequestValues)[] = [];
    if (step === 1) fields = ['client_name', 'client_email'];
    if (step === 2) fields = ['project_description'];

    const isValid = await trigger(fields);
    if (isValid) {
      setStep((s) => s + 1);
      return;
    }
    // Errors were rendering silently before - nothing announced them to a
    // screen reader user and a keyboard user's focus just stayed on the
    // "Next" button. Move focus to the first invalid field so both notice.
    const firstInvalid = fields.find((f) => errors[f]);
    if (firstInvalid) setFocus(firstInvalid);
  };

  const prevStep = () => setStep((s) => s - 1);

  if (isSuccess) {
    const schedulingUrl = configString(config, 'scheduling_url');

    return (
      <div className="rounded-3xl border border-royal-deep/12 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h2 className="font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink">
          Request Sent
        </h2>
        <p className="mx-auto mt-3 mb-8 max-w-md text-sm leading-relaxed text-slate-600">
          Thanks for reaching out. I've received your request for{' '}
          <strong className="text-royal-ink">{serviceTitle}</strong>. You can track its status using
          the reference below.
        </p>

        <div className="mx-auto mb-8 max-w-sm rounded-2xl border border-royal-deep/12 bg-royal-canvas-alt p-5">
          <p className="mb-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Quote Reference
          </p>
          <p className="font-mono-code text-lg font-bold text-royal-deep">{quoteId}</p>
          {quoteId && (
            <Link
              to="/quotes/$quoteId"
              params={{ quoteId }}
              className="mt-2 inline-block text-sm font-semibold text-royal-sapphire transition-colors hover:text-royal-gold-deep"
            >
              View Tracking Page
            </Link>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          {schedulingUrl && (
            <a
              href={schedulingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-3 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Calendar className="h-4 w-4" /> Schedule Strategy Call
            </a>
          )}
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-royal-deep/20 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wider text-royal-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-royal-canvas-alt"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-royal-deep/15 bg-white shadow-[0_16px_40px_rgba(12,27,51,0.12)]">
      <div className="bg-gradient-to-r from-royal-navy via-royal-deep to-royal-sapphire p-6 text-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans-body text-lg font-extrabold">Request a Quote</h2>
          <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-gold-light">
            Step {step} of 3
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-royal-gold transition-[width] duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-8">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client_name">Full Name *</Label>
                    <Input
                      id="client_name"
                      {...register('client_name')}
                      placeholder="John Doe"
                      aria-invalid={!!errors['client_name']}
                      aria-describedby={errors['client_name'] ? 'client_name-error' : undefined}
                    />
                    {errors['client_name'] && (
                      <p id="client_name-error" className="text-xs text-destructive">
                        {errors.client_name?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_email">Email Address *</Label>
                    <Input
                      id="client_email"
                      type="email"
                      {...register('client_email')}
                      placeholder="john@example.com"
                      aria-invalid={!!errors['client_email']}
                      aria-describedby={errors['client_email'] ? 'client_email-error' : undefined}
                    />
                    {errors['client_email'] && (
                      <p id="client_email-error" className="text-xs text-destructive">
                        {errors.client_email?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client_phone">Phone Number (Optional)</Label>
                    <Input
                      id="client_phone"
                      {...register('client_phone')}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name (Optional)</Label>
                    <Input
                      id="company_name"
                      {...register('company_name')}
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="project_description">Project Description *</Label>
                  <Textarea
                    id="project_description"
                    {...register('project_description')}
                    placeholder="Tell us about your project, goals, and any specific requirements..."
                    className="h-40"
                    aria-invalid={!!errors['project_description']}
                    aria-describedby={
                      errors['project_description'] ? 'project_description-error' : undefined
                    }
                  />
                  {errors['project_description'] && (
                    <p id="project_description-error" className="text-xs text-destructive">
                      {errors.project_description?.message}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Expected Budget</Label>
                    <Input
                      id="budget"
                      {...register('budget')}
                      placeholder="e.g. $5,000 - $10,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeline">Desired Timeline</Label>
                    <Input id="timeline" {...register('timeline')} placeholder="e.g. 2-3 months" />
                  </div>
                </div>
                <div className="p-4 bg-royal-canvas-alt rounded-lg border text-sm space-y-2">
                  <p className="font-semibold text-foreground">Summary</p>
                  <p>
                    <span className="text-slate-600">Service:</span> {serviceTitle}
                  </p>
                  <p>
                    <span className="text-slate-600">Contact:</span> {getValues('client_name')} (
                    {getValues('client_email')})
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between border-t border-royal-deep/10 pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-royal-deep"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="group inline-flex items-center gap-1.5 rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Next
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    Send Request <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
