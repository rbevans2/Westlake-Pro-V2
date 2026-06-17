create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Westlake Tree Experts',
  phone text default '(610) 291-1176',
  email text default 'bwestlake@business.com',
  address text default '30 Ivy Ln
Douglassville, PA 19518',
  default_tax_rate numeric default 6,
  created_at timestamptz default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  unique(business_id,user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  marketing_ok boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  title text not null,
  status text default 'Upcoming',
  job_date date,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null check (type in ('Invoice','Estimate')),
  status text default 'Draft',
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  job_id uuid references public.jobs(id) on delete set null,
  job_title text,
  number text,
  doc_date date,
  due_date date,
  line_items jsonb default '[]'::jsonb,
  apply_tax boolean default false,
  tax_rate numeric default 0,
  subtotal numeric default 0,
  tax numeric default 0,
  total numeric default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  serial text,
  hours text,
  last_service date,
  next_service date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  expense_date date,
  category text,
  description text,
  amount numeric default 0,
  created_at timestamptz default now()
);

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.services enable row level security;
alter table public.documents enable row level security;
alter table public.equipment enable row level security;
alter table public.expenses enable row level security;

create or replace function public.is_business_member(bid uuid)
returns boolean language sql security definer stable as $$
  select exists(select 1 from public.business_members bm where bm.business_id = bid and bm.user_id = auth.uid());
$$;

drop policy if exists "business member read" on public.businesses;
drop policy if exists "business insert authenticated" on public.businesses;
drop policy if exists "business member update" on public.businesses;
create policy "business member read" on public.businesses for select using (public.is_business_member(id));
create policy "business insert authenticated" on public.businesses for insert with check (auth.uid() is not null);
create policy "business member update" on public.businesses for update using (public.is_business_member(id)) with check (public.is_business_member(id));

drop policy if exists "members can read own memberships" on public.business_members;
drop policy if exists "members can insert own membership" on public.business_members;
drop policy if exists "members can delete own membership" on public.business_members;
create policy "members can read own memberships" on public.business_members for select using (user_id = auth.uid());
create policy "members can insert own membership" on public.business_members for insert with check (user_id = auth.uid());
create policy "members can delete own membership" on public.business_members for delete using (user_id = auth.uid());

drop policy if exists "customers business access" on public.customers;
drop policy if exists "jobs business access" on public.jobs;
drop policy if exists "services business access" on public.services;
drop policy if exists "documents business access" on public.documents;
drop policy if exists "equipment business access" on public.equipment;
drop policy if exists "expenses business access" on public.expenses;

create policy "customers business access" on public.customers for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "jobs business access" on public.jobs for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "services business access" on public.services for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "documents business access" on public.documents for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "equipment business access" on public.equipment for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "expenses business access" on public.expenses for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));


-- V2 update for document customer details
alter table public.documents add column if not exists customer_phone text;
alter table public.documents add column if not exists customer_email text;
alter table public.documents add column if not exists customer_address text;
