import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getQuoteStatus } from '@/lib/services.functions';
import { useServerFn } from '@tanstack/react-start';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  ClipboardList, 
  FileText,
  Calendar,
  ChevronRight,
  ChevronLeft,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/quotes/$quoteId')({
  component: PublicQuoteStatus,
});

function PublicQuoteStatus() {
  const { quoteId } = Route.useParams();
  const fetchStatus = useServerFn(getQuoteStatus);

  const { data: quote, isLoading } = useQuery({
    queryKey: ['public-quote-status', quoteId],
    queryFn: () => fetchStatus({ data: quoteId })
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    </div>
  );

  if (!quote) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle className="text-destructive">Request Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            We couldn't find a quote request with that reference ID. Please check the link and try again.
          </p>
          <Button asChild className="w-full">
            <Link to="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const steps = [
    { id: 'pending', label: 'Request Received', icon: ClipboardList, description: 'We have received your project details.' },
    { id: 'contacted', label: 'Under Review', icon: MessageSquare, description: 'Our team is reviewing your requirements.' },
    { id: 'proposal_sent', label: 'Proposal Sent', icon: FileText, description: 'We have sent you a detailed proposal.' },
    { id: 'won', label: 'Project Started', icon: CheckCircle2, description: 'The project is officially underway!' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === quote.status);
  const isRejected = quote.status === 'rejected' || quote.status === 'lost';

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 md:py-24">
      <div className="container max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-primary hover:underline mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Website
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Project Quote Status</h1>
          <p className="text-muted-foreground">Reference: {quote.id.slice(0, 8)}</p>
        </div>

        <Card className="overflow-hidden border-none shadow-xl">
          <div className="bg-primary p-8 text-primary-foreground">
            <div className="flex flex-col md:flex-row justify-between gap-6 md:items-center">
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1 uppercase tracking-wider font-semibold">Service Requested</p>
                <h2 className="text-2xl font-bold">{(quote.services as any)?.title || 'Custom Project Consultation'}</h2>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg inline-flex flex-col">
                <span className="text-xs text-primary-foreground/70 flex items-center gap-1"><Calendar className="h-3 w-3" /> Submitted</span>
                <span className="font-semibold">{quote.created_at ? format(new Date(quote.created_at), 'MMMM dd, yyyy') : 'N/A'}</span>
              </div>
            </div>
          </div>
          <CardContent className="p-8 md:p-12">
            <div className="space-y-12">
              <div className="grid gap-8">
                {isRejected ? (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
                    <h3 className="text-xl font-bold text-destructive mb-2">Request Status: {quote.status ? quote.status.charAt(0).toUpperCase() + quote.status.slice(1) : 'Closed'}</h3>
                    <p className="text-muted-foreground">
                      This request is no longer active. If you have any questions, please contact us directly.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Progress Bar */}
                    <div className="hidden md:block absolute top-[22px] left-0 w-full h-1 bg-muted rounded-full">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
                      {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        
                        return (
                          <div key={step.id} className="relative flex md:flex-col items-center md:items-center gap-4 md:gap-4 text-center">
                            <div className={cn(
                              "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500",
                              isActive ? "bg-primary border-primary text-primary-foreground" : "bg-card border-muted text-muted-foreground",
                              isCurrent && "ring-4 ring-primary/20 scale-110"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 md:space-y-1 text-left md:text-center">
                              <h3 className={cn("font-bold text-sm", isActive ? "text-foreground" : "text-muted-foreground")}>
                                {step.label}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 md:max-w-[150px] md:mx-auto">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> Request Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b border-muted">
                      <span className="text-muted-foreground">Requester</span>
                      <span className="font-medium">{quote.client_name}</span>
                    </div>
                    {quote.budget && (
                      <div className="flex justify-between text-sm py-2 border-b border-muted">
                        <span className="text-muted-foreground">Budget Range</span>
                        <span className="font-medium">{quote.budget}</span>
                      </div>
                    )}
                    {quote.timeline && (
                      <div className="flex justify-between text-sm py-2 border-b border-muted">
                        <span className="text-muted-foreground">Timeline</span>
                        <span className="font-medium">{quote.timeline}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-xl p-6 space-y-4">
                  <h3 className="font-bold text-lg">Next Steps</h3>
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    {currentStepIndex === 0 && (
                      <p>We are currently reviewing your project information. You will receive an email from us shortly with follow-up questions or a meeting request.</p>
                    )}
                    {currentStepIndex === 1 && (
                      <p>Our experts are drafting a comprehensive proposal tailored to your needs. Expect to see this in your inbox within 24 hours.</p>
                    )}
                    {currentStepIndex >= 2 && (
                      <p>Your proposal has been sent. Please review it and let us know if you have any questions or would like to move forward.</p>
                    )}
                    <div className="pt-2">
                      <Button variant="outline" className="w-full gap-2" asChild>
                        <a href="mailto:kamrulhasan.freelancer@gmail.com">
                          <MessageSquare className="h-4 w-4" /> Message Support
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-xs text-muted-foreground pt-4">
          &copy; {new Date().getFullYear()} Hasan Kamrul Official. All rights reserved.
        </div>
      </div>
    </div>
  );
}