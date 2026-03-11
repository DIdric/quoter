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
  share_token text unique,
  created_at timestamptz default now()
);

-- Row Level Security (multi-tenant isolation)
alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.quotes enable row level security;

-- Profiles: users can only access their own profile (or public business info for shared quotes)
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Public can view business info for shared quotes"
  on public.profiles for select using (
    exists (
      select 1 from public.quotes
      where quotes.user_id = profiles.id
      and quotes.share_token is not null
    )
  );
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

-- Public access to shared quotes via share_token
create policy "Anyone can view shared quotes"
  on public.quotes for select using (share_token is not null);

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

-- Token usage tracking (AI API costs)
create table public.token_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_estimate numeric(10,6) not null default 0,
  created_at timestamptz default now()
);

-- Default materials (admin-managed, e.g. Hornbach reference prices)
create table public.default_materials (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text not null default 'Overig',
  unit text not null default 'stuk',
  cost_price numeric(10,2) not null default 0,
  source text default 'Hornbach',
  source_url text,
  article_number text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Admin users table
create table public.admin_users (
  user_id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_materials_user_id on public.materials(user_id);
create index idx_quotes_user_id on public.quotes(user_id);
create index idx_quotes_status on public.quotes(status);
create index idx_quotes_share_token on public.quotes(share_token);
create index idx_token_usage_user_id on public.token_usage(user_id);
create index idx_token_usage_created_at on public.token_usage(created_at);
create index idx_default_materials_category on public.default_materials(category);

-- ============================================================
-- Storage bucket for logos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update/overwrite their own logo
create policy "Users can update own logo"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own logo
create policy "Users can delete own logo"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to logos (for PDF generation)
create policy "Public read access for logos"
  on storage.objects for select
  using (bucket_id = 'logos');

-- RLS for token_usage
alter table public.token_usage enable row level security;
create policy "Users can view own token usage"
  on public.token_usage for select using (auth.uid() = user_id);
create policy "Service can insert token usage"
  on public.token_usage for insert with check (true);

-- RLS for default_materials (public read, admin write)
alter table public.default_materials enable row level security;
create policy "Anyone can read default materials"
  on public.default_materials for select using (true);
create policy "Service can manage default materials"
  on public.default_materials for all using (true);

-- RLS for admin_users
alter table public.admin_users enable row level security;
create policy "Admins can read admin_users"
  on public.admin_users for select using (auth.uid() = user_id);
