-- Orders table to track gig purchases
create table public.orders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    package_id uuid references public.gig_packages(id) on delete set null,
    amount numeric not null,
    currency text not null default 'USD',
    status text not null default 'pending', -- pending, completed, failed, refunded
    stripe_session_id text unique,
    stripe_payment_intent_id text unique,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Grant access to orders
grant select on public.orders to authenticated;
grant all on public.orders to service_role;

-- Enable RLS
alter table public.orders enable row level security;

-- Policies for orders
create policy "Users can view their own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

-- Super admin and admins can view all orders
create policy "Admins can view all orders"
on public.orders
for select
to authenticated
using (
    public.has_role(auth.uid(), 'super_admin') or 
    public.has_role(auth.uid(), 'admin')
);

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger handle_orders_updated_at
    before update on public.orders
    for each row
    execute function public.handle_updated_at();
