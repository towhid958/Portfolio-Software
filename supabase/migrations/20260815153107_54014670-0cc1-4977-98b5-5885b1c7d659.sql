-- Gig reviews table
create table public.gig_reviews (
    id uuid primary key default gen_random_uuid(),
    gig_id uuid references public.gigs(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null,
    order_id uuid references public.orders(id) on delete set null,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text,
    reviewer_name text not null,
    reviewer_avatar text,
    status text not null default 'pending', -- pending, approved, rejected
    is_verified_purchase boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Grant access
grant select on public.gig_reviews to anon, authenticated;
grant insert on public.gig_reviews to authenticated;
grant update, delete on public.gig_reviews to authenticated;
grant all on public.gig_reviews to service_role;

-- Enable RLS
alter table public.gig_reviews enable row level security;

-- Policies
create policy "Anyone can view approved reviews"
on public.gig_reviews
for select
using (status = 'approved');

create policy "Users can insert their own reviews"
on public.gig_reviews
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can manage all reviews"
on public.gig_reviews
for all
to authenticated
using (
    public.has_role(auth.uid(), 'super_admin') or 
    public.has_role(auth.uid(), 'admin')
);

-- Fix security linter for new trigger or existing one
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

create trigger handle_gig_reviews_updated_at
    before update on public.gig_reviews
    for each row
    execute function public.handle_updated_at();
