import { z } from 'zod';

// Category now lives in the URL path (/gigs/category/$slug) rather than as a
// search param - this schema only covers the filters that still live in the
// query string, and is shared between /gigs and /gigs/category/$slug so both
// routes accept the exact same search shape.
export const gigSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  minPrice: z.number().optional().catch(undefined),
  maxPrice: z.number().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  page: z.number().optional().default(1).catch(1),
});

export type GigSearch = z.infer<typeof gigSearchSchema>;
