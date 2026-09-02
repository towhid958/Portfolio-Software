import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { EditorShell } from '@/components/admin/builder/EditorShell';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/pages/edit/$pageSlug')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'pages', 'edit');
    if (!allowed) {
      throw redirect({ to: '/admin/pages' });
    }
  },
  component: EditPageRoute,
});

function EditPageRoute() {
  const { pageSlug } = Route.useParams();
  const { data: page, isLoading } = useQuery({
    queryKey: ['admin-page', pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').eq('slug', pageSlug).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <h2 className="text-xl font-bold">Page not found</h2>
        <p className="text-muted-foreground">This page may have been deleted or its URL changed.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/pages">
            <ChevronLeft className="h-4 w-4 mr-2" /> Back to Pages
          </Link>
        </Button>
      </div>
    );
  }

  // Keyed so navigating between different pages (rather than staying on
  // one) always mounts a fresh editor instance instead of reusing state.
  return <EditorShell key={page.id} page={page} />;
}
