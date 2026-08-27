create table if not exists public.site_configuration (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb,
  category text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

grant select, insert, update on public.site_configuration to authenticated;
grant all on public.site_configuration to service_role;
alter table public.site_configuration enable row level security;

-- Client Portal Settings
create table if not exists public.client_portal_settings (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  is_enabled boolean default true,
  access_level text default 'full',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

grant select, insert, update on public.client_portal_settings to authenticated;
grant all on public.client_portal_settings to service_role;
alter table public.client_portal_settings enable row level security;
