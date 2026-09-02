import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveCan, type Role } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MousePointer2, 
  TrendingUp, 
  Calendar,
  Handshake,
  ExternalLink,
  ArrowUpRight,
  Loader2,
  Filter
} from 'lucide-react';
import { format, startOfDay, subDays, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { useState } from 'react';

export const Route = createFileRoute('/admin/partners/analytics')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'partners', 'view');
    if (!allowed) {
      throw redirect({ to: '/admin' });
    }
  },
  component: PartnerAnalytics,
});

function PartnerAnalytics() {
  const [dateRange, setDateRange] = useState('30'); // '7', '30', '90', 'month'

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['admin-partner-analytics', dateRange],
    queryFn: async () => {
      let startDate: Date;
      const now = new Date();

      if (dateRange === '7') {
        startDate = subDays(now, 6);
      } else if (dateRange === '90') {
        startDate = subDays(now, 89);
      } else if (dateRange === 'month') {
        startDate = startOfMonth(now);
      } else {
        startDate = subDays(now, 29);
      }

      // Fetch all activity logs related to offers in range - click_offer is
      // the only offer-related action this app actually records (see
      // partners/index.tsx's handleClaimOffer). signup_offer/convert_offer
      // used to be queried here too, fed by Math.random() coin-flips on
      // the public side with no real signal behind them - genuinely
      // tracking a signup/conversion after a visitor leaves for an
      // external partner's site would need a real postback/pixel
      // integration that doesn't exist, so those metrics were removed
      // rather than left fake.
      const { data: logs, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('action', 'click_offer')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (logsError) throw logsError;

      // Fetch all offers to map IDs to titles
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, title, partner_id, partners(name)');
      
      if (offersError) throw offersError;

      // Calculate traffic source breakdown
      const trafficSources = logs.reduce((acc: any, log: any) => {
        const source = (log.details as any)?.utm_source || (log.details as any)?.referrer || 'direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      const utmBreakdown = logs.reduce((acc: any, log: any) => {
        const utm = (log.details as any)?.utm_campaign || 'none';
        acc[utm] = (acc[utm] || 0) + 1;
        return acc;
      }, {});

      return {
        logs,
        offers,
        startDate,
        trafficSources: Object.entries(trafficSources).map(([name, value]) => ({ name, value })),
        utmBreakdown: Object.entries(utmBreakdown).map(([name, value]) => ({ name, value }))
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const logs = analyticsData?.logs || [];
  const offers = analyticsData?.offers || [];
  const startDate = analyticsData?.startDate || subDays(new Date(), 29);
  const trafficSources = analyticsData?.trafficSources || [];
  const utmBreakdown = analyticsData?.utmBreakdown || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Prepare data for the interval
  const intervalDays = eachDayOfInterval({
    start: startDate,
    end: new Date(),
  });

  const chartData = intervalDays.map(date => {
    const dayLogs = logs.filter(log => isSameDay(new Date(log.created_at!), date));
    return {
      date: format(date, 'MMM d'),
      clicks: dayLogs.length,
    };
  });

  // Calculate stats per offer
  const offerStats = offers.map(offer => {
    const offerLogs = logs.filter(log => (log.details as any)?.offer_id === offer.id);

    // Find top source for this specific offer
    const sources = offerLogs.reduce((acc: any, log: any) => {
      const source = (log.details as any)?.utm_source || (log.details as any)?.referrer || 'direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const topSource = Object.entries(sources).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      id: offer.id,
      title: offer.title,
      partner: (offer.partners as any)?.name || 'Unknown',
      clicks: offerLogs.length,
      lastClick: offerLogs.length > 0 ? offerLogs[offerLogs.length - 1]?.created_at : null,
      topSource,
    };
  }).sort((a, b) => b.clicks - a.clicks);

  const totalClicks = logs.length;
  const topOffer = offerStats.length > 0 ? offerStats[0] : null;

  const rangeLabels: Record<string, string> = {
    '7': 'Last 7 Days',
    '30': 'Last 30 Days',
    '90': 'Last 90 Days',
    'month': 'This Month'
  };
  const rangeLabel = rangeLabels[dateRange] || 'Custom Range';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Partner Analytics</h1>
          <p className="text-muted-foreground">Track click performance across partner offers.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Total Clicks</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground">{totalClicks}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-primary font-medium">
              <TrendingUp className="h-3 w-3 mr-1" />
              {rangeLabel}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Top Offer</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground truncate">{topOffer?.title || 'N/A'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {topOffer?.clicks || 0} clicks
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Active Partners</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground">
              {new Set(offers.map(o => (o.partners as any)?.name)).size}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Across {offers.length} active offers
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6 bg-card border-border shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-foreground">Performance Over Time</CardTitle>
          <CardDescription>Daily clicks for the selected period.</CardDescription>
        </CardHeader>
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                name="Clicks"
                type="monotone"
                dataKey="clicks"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Traffic Sources</CardTitle>
            <CardDescription>Breakdown by UTM source and referrers.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {trafficSources.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Campaign Performance</CardTitle>
            <CardDescription>Clicks driven by UTM campaign parameters.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utmBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Top Offers by Clicks</CardTitle>
            <CardDescription>
              Signup/conversion tracking isn't shown here - after a click, the visitor leaves for the partner's own site, and
              there's no postback or pixel integration in place to know what happens next. What's below is real click data only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={offerStats.slice(0, 6)} margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted))" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    width={140}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="clicks" name="Clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Offer Performance Detail</CardTitle>
            <CardDescription>Breakdown of performance metrics per individual partner offer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Offer</TableHead>
                  <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Clicks</TableHead>
                  <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Top Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerStats.map((stat) => (
                  <TableRow key={stat.id} className="border-border hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">{stat.title}</span>
                        <span className="text-xs text-muted-foreground">{stat.partner}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {stat.clicks}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {stat.topSource}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {offerStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No data found for the selected range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
