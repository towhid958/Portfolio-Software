import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/blog/edit/$postSlug')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'blog', 'edit');
    if (!allowed) {
      throw redirect({ to: '/admin/blog' });
    }
  },
  component: RouteComponent,
})

import { useQuery } from '@tanstack/react-query';
import { BlogForm } from '@/components/admin/BlogForm';

function RouteComponent() {
  const { postSlug } = Route.useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ['admin-blog-post', postSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', postSlug).single();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="p-8 text-center">Loading post...</div>;
  return <BlogForm post={post} />;
}
