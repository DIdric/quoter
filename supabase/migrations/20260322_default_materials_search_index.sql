-- Enable pg_trgm for fast substring/ilike search on large text columns
create extension if not exists pg_trgm;

-- GIN trigram index on name: makes ilike '%term%' O(log n) instead of O(n)
create index if not exists idx_default_materials_name_trgm
  on public.default_materials
  using gin (name gin_trgm_ops);
