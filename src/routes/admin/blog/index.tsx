import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, Lock, Search, Download, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';
import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkEditDialog } from '@/components/admin/BulkEditDialog';
import { ManageCategoriesDialog } from '@/components/admin/ManageCategoriesDialog';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';
import { format } from 'date-fns';

export const Route = createFileRoute('/admin/blog/')({
  component: AdminBlogPage,
});

function AdminBlogPage() {
  const { can, isLoading: rbacLoading } = useRBAC();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, blog_categories(id, name, slug)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      await logActivity('blog', 'delete_post', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Post deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error deleting post: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'blog',
        action: 'bulk_delete',
        details: { ids } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('blog_posts').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(`${selectedIds.length} posts deleted successfully`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error deleting posts: ${error.message}`);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'blog',
        action: `bulk_status_${status}`,
        details: { ids, status } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('blog_posts').update({ 
        status,
        published_at: status === 'published' ? new Date().toISOString() : null
      }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(`${selectedIds.length} posts marked as ${variables.status}`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error updating posts: ${error.message}`);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: any }) => {
      const { error } = await supabase.from('blog_posts').update(values as any).in('id', ids);
      if (error) throw error;
      await logActivity('blog', 'bulk_update', { ids, values });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(`${selectedIds.length} posts updated successfully`);
      setSelectedIds([]);
      setIsBulkEditOpen(false);
    },
    onError: (error) => {
      toast.error(`Error updating posts: ${error.message}`);
    },
  });

  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredPosts = useMemo(() => {
    return (posts ?? []).filter((post) => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || post.category_id === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [posts, searchQuery, statusFilter, categoryFilter]);

  const { pageItems: pagedPosts, page, setPage, totalPages, total, pageSize } = usePagination(filteredPosts);

  const handleExport = () => {
    exportToCSV(`blog-posts-${format(new Date(), 'yyyy-MM-dd')}`, filteredPosts.map((p) => ({
      title: p.title,
      status: p.status,
      category: p.blog_categories?.name || '',
      published_at: p.published_at || '',
    })));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPosts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPosts.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('blog', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view blog posts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Blog Management</h2>
          <p className="text-muted-foreground">Write and manage your articles and insights.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsCategoriesOpen(true)}>
            <FolderOpen className="h-4 w-4" /> Manage Categories
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredPosts.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {can('blog', 'create') && (
            <Button className="gap-2" asChild>
              <Link to="/admin/blog/new">
                <Plus className="h-4 w-4" /> New Post
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>All Posts</CardTitle>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                {selectedIds.length} selected
              </span>
              {can('blog', 'edit') && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'published' })}
                    disabled={bulkStatusMutation.isPending}
                  >
                    Publish
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'draft' })}
                    disabled={bulkStatusMutation.isPending}
                  >
                  Unpublish
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsBulkEditOpen(true)}
                    disabled={bulkStatusMutation.isPending || bulkUpdateMutation.isPending}
                  >
                    Bulk Edit
                  </Button>
                </>
              )}
              {can('blog', 'delete') && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} posts?`)) {
                      bulkDeleteMutation.mutate(selectedIds);
                    }
                  }}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading posts...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={filteredPosts.length > 0 && selectedIds.length === filteredPosts.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Published At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPosts.map((post) => (
                  <TableRow key={post.id} className={selectedIds.includes(post.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(post.id)}
                        onCheckedChange={() => toggleSelect(post.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-md truncate">{post.title}</TableCell>
                    <TableCell>
                      <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{post.blog_categories?.name || 'Uncategorized'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Not published'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild title="View Publicly">
                          <Link to="/blog/$slug" params={{ slug: post.slug }} target="_blank">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {can('blog', 'edit') && (
                          <Button variant="ghost" size="icon" asChild title="Edit Post">
                            <Link to="/admin/blog/edit/$postSlug" params={{ postSlug: post.slug }}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {can('blog', 'delete') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this blog post?')) {
                                deleteMutation.mutate(post.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPosts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {posts?.length === 0 ? 'No blog posts found.' : 'No posts match your filters.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>

      <BulkEditDialog
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        onConfirm={(values) => bulkUpdateMutation.mutate({ ids: selectedIds, values })}
        selectedCount={selectedIds.length}
        title="Bulk Edit Blog Posts"
        isPending={bulkUpdateMutation.isPending}
        fields={[
          {
            label: 'Status',
            name: 'status',
            type: 'select',
            options: [
              { label: 'Published', value: 'published' },
              { label: 'Draft', value: 'draft' },
            ],
          },
          {
            label: 'Category',
            name: 'category_id',
            type: 'select',
            options: (categories ?? []).map((cat) => ({ label: cat.name, value: cat.id })),
          },
        ]}
      />

      <ManageCategoriesDialog
        open={isCategoriesOpen}
        onOpenChange={setIsCategoriesOpen}
        table="blog_categories"
        module="blog"
        queryKey={['admin-blog-categories']}
        invalidateKeys={[['admin-blog-posts']]}
        description="Create, rename, or delete blog categories."
      />
    </div>
  );
}
