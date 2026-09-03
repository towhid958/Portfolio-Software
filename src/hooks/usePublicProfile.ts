import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// The site owner's public identity (name/title/avatar/bio), shown wherever
// a public page needs to say who's behind the work - homepage hero, gig
// pages, blog posts. Previously each of those pages hand-typed its own
// "Hasan Kamrul" / "HK" / role text independently of this table and of each
// other, so they could (and did) drift out of sync with the real profile.
// There's exactly one such profile in a single-owner site, so grabbing the
// first row is the same assumption the homepage already made before this
// hook existed.
export function usePublicProfile() {
  return useQuery({
    queryKey: ['public-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, professional_title, avatar_url, bio')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
