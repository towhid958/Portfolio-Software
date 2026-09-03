import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { quoteRequestSchema, type QuoteRequestValues } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, ChevronRight, ChevronLeft, Send, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSiteConfiguration } from '@/lib/settings.functions';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { submitServiceInquiry } from '@/lib/services.functions';

interface QuoteRequestFormProps {
  serviceId?: string;
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

  const form = useForm<any>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      client_name: '',
      client_email: '',
      project_description: '',
      custom_answers: {},
    }
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
          serviceId
        }
      });
      return result;
    },
    onSuccess: (result) => {
      setIsSuccess(true);
      setQuoteId(result.id);
      toast.success('Quote request sent successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send quote request');
    }
  });

  const nextStep = async () => {
    let fields: (keyof QuoteRequestValues)[] = [];
    if (step === 1) fields = ['client_name', 'client_email'];
    if (step === 2) fields = ['project_description'];

    const isValid = await trigger(fields);
    if (isValid) {
      setStep(s => s + 1);
      return;
    }
    // Errors were rendering silently before - nothing announced them to a
    // screen reader user and a keyboard user's focus just stayed on the
    // "Next" button. Move focus to the first invalid field so both notice.
    const firstInvalid = fields.find((f) => errors[f]);
    if (firstInvalid) setFocus(firstInvalid);
  };

  const prevStep = () => setStep(s => s - 1);

  if (isSuccess) {
    const schedulingUrl = config?.scheduling_url;

    return (
      <div className="text-center py-20 px-4">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 text-green-600 mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Request Sent!</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Thank you for reaching out. We have received your request for <strong>{serviceTitle}</strong>. 
          You can track the status of your request using the reference below.
        </p>
        
        <div className="bg-muted p-4 rounded-lg border mb-8 max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Quote Reference</p>
          <p className="text-lg font-mono font-bold">{quoteId}</p>
          {quoteId && (
            <Link 
              to={'/quotes/$quoteId' as any} 
              params={{ quoteId } as any}
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              View Tracking Page
            </Link>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {schedulingUrl && (
            <Button className="gap-2" asChild>
              <a href={schedulingUrl} target="_blank" rel="noopener noreferrer">
                <Calendar className="h-4 w-4" /> Schedule Strategy Call
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      <div className="bg-primary p-6 text-primary-foreground">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Request a Quote</h2>
          <span className="text-sm font-medium opacity-80">Step {step} of 3</span>
        </div>
        <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
          <motion.div 
            className="bg-white h-full"
            initial={{ width: '33.33%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>
      
      <CardContent className="p-8">
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
                    {errors['client_name'] && <p id="client_name-error" className="text-xs text-destructive">{(errors['client_name'] as any)?.message}</p>}
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
                    {errors['client_email'] && <p id="client_email-error" className="text-xs text-destructive">{(errors['client_email'] as any)?.message}</p>}
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client_phone">Phone Number (Optional)</Label>
                    <Input id="client_phone" {...register('client_phone')} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name (Optional)</Label>
                    <Input id="company_name" {...register('company_name')} placeholder="Acme Inc." />
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
                    aria-describedby={errors['project_description'] ? 'project_description-error' : undefined}
                  />
                  {errors['project_description'] && <p id="project_description-error" className="text-xs text-destructive">{(errors['project_description'] as any)?.message}</p>}
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
                    <Input id="budget" {...register('budget')} placeholder="e.g. $5,000 - $10,000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeline">Desired Timeline</Label>
                    <Input id="timeline" {...register('timeline')} placeholder="e.g. 2-3 months" />
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border text-sm space-y-2">
                  <p className="font-semibold text-foreground">Summary</p>
                  <p><span className="text-muted-foreground">Service:</span> {serviceTitle}</p>
                  <p><span className="text-muted-foreground">Contact:</span> {getValues('client_name')} ({getValues('client_email')})</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-10 pt-6 border-t">
            {step > 1 ? (
              <Button type="button" variant="ghost" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            ) : <div />}

            {step < 3 ? (
              <Button type="button" onClick={nextStep}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    Send Request <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}