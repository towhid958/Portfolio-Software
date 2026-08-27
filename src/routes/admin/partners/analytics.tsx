import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      // Fetch all activity logs related to offers in range
      const { data: logs, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('action', 'click_offer')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (logsError) throw logsError;

      // Also track conversions (simulated via another action if it exists, or filtered clicks)
      const { data: conversions, error: convError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('action', 'convert_offer')
        .gte('created_at', startDate.toISOString());
      
      if (convError) throw convError;

      // Track signups (intermediate step in the funnel)
      const { data: signups, error: signupError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('action', 'signup_offer')
        .gte('created_at', startDate.toISOString());
      
      if (signupError) throw signupError;

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
        conversions: conversions || [], 
        signups: signups || [],
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
  const conversions = analyticsData?.conversions || [];
  const signups = analyticsData?.signups || [];
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
    const dayConversions = conversions.filter(log => isSameDay(new Date(log.created_at!), date));
    return {
      date: format(date, 'MMM d'),
      clicks: dayLogs.length,
      conversions: dayConversions.length,
    };
  });

  // Calculate stats per offer
  const offerStats = offers.map(offer => {
    const offerLogs = logs.filter(log => (log.details as any)?.offer_id === offer.id);
    const offerSignups = signups.filter(log => (log.details as any)?.offer_id === offer.id);
    const offerConversions = conversions.filter(log => (log.details as any)?.offer_id === offer.id);
    
    // Find top source for this specific offer
    const sources = offerLogs.reduce((acc: any, log: any) => {
      const source = (log.details as any)?.utm_source || (log.details as any)?.referrer || 'direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    const topSource = Object.entries(sources).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Funnel steps for visualization
    const funnelSteps = [
      { name: 'Clicks', value: offerLogs.length, fill: '#3b82f6' },
      { name: 'Signups', value: offerSignups.length, fill: '#8b5cf6' },
      { name: 'Conversions', value: offerConversions.length, fill: '#10b981' }
    ];

    return {
      id: offer.id,
      title: offer.title,
      partner: (offer.partners as any)?.name || 'Unknown',
      clicks: offerLogs.length,
      signups: offerSignups.length,
      conversions: offerConversions.length,
      conversionRate: offerLogs.length > 0 ? ((offerConversions.length / offerLogs.length) * 100).toFixed(1) : '0',
      lastClick: offerLogs.length > 0 ? offerLogs[offerLogs.length - 1]?.created_at : null,
      topSource,
      funnelSteps
    };
  }).sort((a, b) => b.clicks - a.clicks);

  const totalClicks = logs.length;
  const totalConversions = conversions.length;
  const avgConversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0';
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
          <p className="text-muted-foreground">Track click performance and conversion engagement.</p>
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

      <div className="grid gap-6 md:grid-cols-4">
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
            <CardDescription className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Total Conversions</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground">{totalConversions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {avgConversionRate}% avg. rate
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
              {topOffer?.clicks || 0} clicks · {topOffer?.conversionRate || 0}% conv.
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
          <CardDescription>Daily clicks and conversions for the selected period.</CardDescription>
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
              <Line 
                name="Conversions"
                type="monotone" 
                dataKey="conversions" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 4, fill: '#10b981' }}
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
            <CardTitle className="text-foreground">Conversion Funnel by Offer</CardTitle>
            <CardDescription>Visualization of user journey from discovery to conversion.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {offerStats.slice(0, 6).map((stat) => (
                <div key={stat.id} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h4 className="font-medium text-sm text-foreground">{stat.title}</h4>
                      <p className="text-xs text-muted-foreground">{stat.partner}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {stat.conversionRate}% Conv.
                    </Badge>
                  </div>
                  
                  <div className="h-[200px] w-full bg-muted/20 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={stat.funnelSteps} margin={{ left: -20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          width={70}
                        />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                          {stat.funnelSteps.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground uppercase font-bold tracking-wider">Clicks</span>
                      <span className="text-primary font-medium">{stat.clicks}</span>
                    </div>
                    <div className="flex flex-col border-x border-border">
                      <span className="text-muted-foreground uppercase font-bold tracking-wider">Signups</span>
                      <span className="text-purple-500 font-medium">{stat.signups}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground uppercase font-bold tracking-wider">Conv.</span>
                      <span className="text-emerald-500 font-medium">{stat.conversions}</span>
                    </div>
                  </div>
                </div>
              ))}
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
                  <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Signups</TableHead>
                  <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Conversions</TableHead>
                  <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Rate</TableHead>
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
                    <TableCell className="text-right font-medium text-purple-500">
                      {stat.signups}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-500">
                      {stat.conversions}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {stat.conversionRate}%
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
