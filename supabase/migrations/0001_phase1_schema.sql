-- MindBridge Phase 1 schema

create extension if not exists "pgcrypto";

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null,
  country text,
  age_band text,
  main_reason text,
  current_risk_level text not null default 'none' check (current_risk_level in ('none', 'low', 'medium', 'high', 'imminent')),
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  risk_level text check (risk_level in ('none', 'low', 'medium', 'high', 'imminent')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.clarity_maps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  map_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  risk_level text not null check (risk_level in ('none', 'low', 'medium', 'high', 'imminent')),
  categories text[] not null default '{}',
  action_taken text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'global',
  topic text not null,
  category text not null,
  name text not null,
  description text not null,
  url text,
  phone text,
  priority integer not null default 100,
  verified_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  clarity_rating integer check (clarity_rating between 1 and 5),
  helpfulness_rating integer check (helpfulness_rating between 1 and 5),
  felt_safe boolean,
  unsafe_or_unhelpful boolean not null default false,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_session_created on public.messages(session_id, created_at);
create index if not exists idx_safety_events_session_created on public.safety_events(session_id, created_at);
create index if not exists idx_resources_country_topic on public.resources(country, topic);
create index if not exists idx_resources_category_priority on public.resources(category, priority);

alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.clarity_maps enable row level security;
alter table public.safety_events enable row level security;
alter table public.resources enable row level security;
alter table public.feedback enable row level security;

-- Phase 1 note:
-- Use server-side service role for writes through API routes.
-- Public reads for resources are acceptable for curated non-sensitive data.
create policy "Public can read resources" on public.resources
  for select using (true);
