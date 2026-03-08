-- Supabase SQL Schema for Quoter SaaS
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  business_name text,
  logo_url text,
  business_address text,
  business_postal_code text,
  business_city text,
  business_phone text,
  business_email text,
  kvk_number text,
  btw_number text,
  iban text,
  hourly_rate numeric(10,2) default 45.00,
  margin_percentage numeric(5,2) default 15.00,
  quote_validity_days integer default 30,
  created_at timestamptz default now()
);

-- Materials table
create table public.materials (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  unit text not null default 'stuk',
  cost_price numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- Quotes table
create table public.quotes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  client_name text not null,
  status text not null default 'draft' check (status in ('draft', 'final')),
  json_data jsonb,
  pdf_url text,
  created_at timestamptz default now()
);

-- Row Level Security (multi-tenant isolation)
alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.quotes enable row level security;

-- Profiles: users can only access their own profile
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Materials: users can only access their own materials
create policy "Users can view own materials"
  on public.materials for select using (auth.uid() = user_id);
create policy "Users can insert own materials"
  on public.materials for insert with check (auth.uid() = user_id);
create policy "Users can update own materials"
  on public.materials for update using (auth.uid() = user_id);
create policy "Users can delete own materials"
  on public.materials for delete using (auth.uid() = user_id);

-- Quotes: users can only access their own quotes
create policy "Users can view own quotes"
  on public.quotes for select using (auth.uid() = user_id);
create policy "Users can insert own quotes"
  on public.quotes for insert with check (auth.uid() = user_id);
create policy "Users can update own quotes"
  on public.quotes for update using (auth.uid() = user_id);
create policy "Users can delete own quotes"
  on public.quotes for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index idx_materials_user_id on public.materials(user_id);
create index idx_quotes_user_id on public.quotes(user_id);
create index idx_quotes_status on public.quotes(status);
