import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowRight, 
  Search, 
  Zap, 
  Star, 
  CheckCircle2, 
  Filter, 
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { z } from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const gigSearchSchema = z.object({
  category: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  minPrice: z.number().optional().catch(undefined),
  maxPrice: z.number().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  page: z.number().optional().default(1).catch(1),
});

type GigSearch = z.infer<typeof gigSearchSchema>;

export const Route = createFileRoute('/gigs/')({
  validateSearch: (search) => gigSearchSchema.parse(search),
  component: GigsPage,
});

const ITEMS_PER_PAGE = 6;

function GigsPage() {
  const search = useSearch({ from: '/gigs/' });
  const navigate = useNavigate({ from: '/gigs/' });
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(search.q || '');

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search.q) {
        navigate({ 
          search: (prev) => ({ ...prev, q: localSearch || undefined, page: 1 }) 
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, navigate, search.q]);

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all unique tags from gigs for the filter
  const { data: allTags } = useQuery({
    queryKey: ['gig-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gigs').select('tags');
      if (error) throw error;
      const tagsSet = new Set<string>();
      data.forEach(gig => {
        if (Array.isArray(gig.tags)) {
          gig.tags.forEach((tag: any) => tagsSet.add(String(tag)));
        }
      });
      return Array.from(tagsSet).sort();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['gigs', search],
    queryFn: async () => {
      let query = supabase
        .from('gigs')
        .select('*, service_categories!inner(name, slug), gig_packages(price)', { count: 'exact' })
        .eq('status', 'published');

      if (search.category) {
        query = query.eq('service_categories.slug', search.category);
      }

      if (search.q) {
        query = query.ilike('title', `%${search.q}%`);
      }

      // Filter by tags using JSONB containment
      if (search.tags && search.tags.length > 0) {
        query = query.contains('tags', search.tags);
      }

      const { data: gigsData, count, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredGigs = gigsData as any[];

      // Price range filtering (happens in memory because it depends on nested gig_packages)
      if (search.minPrice !== undefined || search.maxPrice !== undefined) {
        filteredGigs = filteredGigs.filter(gig => {
          const prices = gig.gig_packages?.map((p: any) => p.price) || [];
          if (prices.length === 0) return false;
          const minGigPrice = Math.min(...prices);
          const maxGigPrice = Math.max(...prices);
          
          const meetsMin = search.minPrice === undefined || minGigPrice >= search.minPrice;
          const meetsMax = search.maxPrice === undefined || minGigPrice <= search.maxPrice;
          
          return meetsMin && meetsMax;
        });
      }

      // Pagination in memory after price filter
      const totalCount = filteredGigs.length;
      const from = (search.page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE;
      const paginatedGigs = filteredGigs.slice(from, to);

      return {
        gigs: paginatedGigs,
        totalCount,
        totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE)
      };
    },
  });

  const handlePriceChange = (value: number[]) => {
    navigate({
      search: (prev) => ({ 
        ...prev, 
        minPrice: value[0] === 0 ? undefined : value[0],
        maxPrice: value[1] === 2000 ? undefined : value[1],
        page: 1
      })
    });
  };

  const toggleTag = (tag: string) => {
    const currentTags = search.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    navigate({
      search: (prev) => ({ 
        ...prev, 
        tags: newTags.length > 0 ? newTags : undefined,
        page: 1
      })
    });
  };

  const clearFilters = () => {
    setLocalSearch('');
    navigate({
      search: () => ({ page: 1 })
    });
  };

  const hasFilters = search.category || search.q || search.minPrice || search.maxPrice || (search.tags && search.tags.length > 0);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Service Marketplace</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Professional, packaged services designed to scale your business with predictable results.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search gigs..." 
                className="pl-10 h-11 rounded-xl"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className={cn("h-11 rounded-xl gap-2", showFilters && "bg-muted")}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-primary text-primary-foreground">
                  Active
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className={cn(
          "grid gap-8 overflow-hidden transition-all duration-300 ease-in-out",
          showFilters ? "max-h-[1000px] mb-12 border rounded-2xl p-6 bg-muted/20" : "max-h-0"
        )}>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
            {/* Category Filter */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Categories</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={!search.category ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => navigate({ search: (prev) => ({ ...prev, category: undefined, page: 1 }) })}
                >
                  All
                </Button>
                {categories?.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={search.category === cat.slug ? "default" : "outline"}
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => navigate({ search: (prev) => ({ ...prev, category: cat.slug, page: 1 }) })}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Price Range</h4>
                <span className="text-xs font-medium">
                  ${search.minPrice || 0} - ${search.maxPrice || 2000}+
                </span>
              </div>
              <div className="px-2 pt-2">
                <Slider 
                  defaultValue={[search.minPrice || 0, search.maxPrice || 2000]} 
                  max={2000} 
                  step={50}
                  onValueCommit={handlePriceChange}
                  className="cursor-pointer"
                />
              </div>
            </div>

            {/* Tags Filter */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Service Tags</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {allTags?.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`tag-${tag}`} 
                      checked={search.tags?.includes(tag) || false}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    <label 
                      htmlFor={`tag-${tag}`}
                      className="text-sm font-medium leading-none cursor-pointer select-none"
                    >
                      {tag}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t gap-4">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-2" /> Clear All
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => setShowFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Gallery */}
        {isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[400px] rounded-xl" />
            ))}
          </div>
        ) : data?.gigs?.length === 0 ? (
          <div className="text-center py-20 border rounded-xl bg-muted/30">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium">No gigs found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your filters or clearing your search.</p>
            {hasFilters && (
              <Button variant="outline" className="mt-6" onClick={clearFilters}>
                Reset all filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {data?.gigs?.map((gig: any) => {
                const minPrice = gig.gig_packages?.length > 0 
                  ? Math.min(...gig.gig_packages.map((p: any) => p.price))
                  : null;
                  
                return (
                  <Card key={gig.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 flex flex-col bg-card">
                    <Link to="/gigs/$slug" params={{ slug: gig.slug }}>
                      <div className="relative aspect-video overflow-hidden">
                        <img 
                          src={gig.thumbnail || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60'} 
                          alt={gig.title}
                          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                        {gig.is_featured && (
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none gap-1">
                              <Star className="h-3 w-3 fill-current" /> Featured
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-6 flex flex-col flex-grow space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-xs">
                          {gig.service_categories?.name}
                        </Badge>
                        {minPrice && (
                          <div className="text-sm font-medium">
                            Starts at <span className="text-lg font-bold text-primary">${minPrice}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          <Link to="/gigs/$slug" params={{ slug: gig.slug }}>
                            {gig.title}
                          </Link>
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {gig.short_description}
                        </p>
                      </div>

                      {gig.tags && Array.isArray(gig.tags) && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {(gig.tags as string[]).slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 px-2 py-0.5 rounded bg-muted/50">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
  
                      <div className="pt-4 mt-auto border-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                            HK
                          </div>
                          <span className="text-xs font-bold">Hasan Kamrul</span>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-2 group/btn" asChild>
                          <Link to="/gigs/$slug" params={{ slug: gig.slug }}>
                            View Details <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="mt-16">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={search.page <= 1}
                        onClick={() => navigate({ search: (prev) => ({ ...prev, page: Math.max(1, search.page - 1) }) })}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                    </PaginationItem>
                    
                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <Button
                          variant={search.page === page ? "default" : "ghost"}
                          size="sm"
                          className="w-9 h-9 p-0"
                          onClick={() => navigate({ search: (prev) => ({ ...prev, page }) })}
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={search.page >= data.totalPages}
                        onClick={() => navigate({ search: (prev) => ({ ...prev, page: Math.min(data.totalPages, search.page + 1) }) })}
                        className="gap-1"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}

        {/* Benefits Section */}
        <div className="mt-32 grid gap-12 md:grid-cols-3 pt-16 border-t">
          <div className="space-y-4 text-center md:text-left">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto md:mx-0">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Fast Delivery</h3>
            <p className="text-muted-foreground">Most services are delivered within 7-14 days with regular progress updates.</p>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mx-auto md:mx-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Fixed Pricing</h3>
            <p className="text-muted-foreground">No hidden costs or hourly surprises. You know exactly what you get for the price.</p>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto md:mx-0">
              <Star className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Premium Quality</h3>
            <p className="text-muted-foreground">Every gig is handled with high attention to detail and professional standards.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
