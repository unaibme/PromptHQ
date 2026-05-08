# Supabase Setup (Run Commands First)

Run the following SQL in Supabase SQL Editor, in this exact order:

```sql
create extension if not exists pgcrypto;

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  name text default '',
  title text not null,
  content text not null,
  keywords text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prompts add column if not exists name text default '';
alter table public.prompts add column if not exists title text;
alter table public.prompts add column if not exists content text;
alter table public.prompts add column if not exists keywords text[] default '{}';
alter table public.prompts add column if not exists created_at timestamptz default now();
alter table public.prompts add column if not exists updated_at timestamptz default now();

update public.prompts set title = '' where title is null;
update public.prompts set content = '' where content is null;
update public.prompts set keywords = '{}' where keywords is null;
update public.prompts set created_at = now() where created_at is null;
update public.prompts set updated_at = now() where updated_at is null;

alter table public.prompts alter column title set not null;
alter table public.prompts alter column content set not null;
alter table public.prompts alter column created_at set not null;
alter table public.prompts alter column updated_at set not null;

alter table public.prompts enable row level security;

drop policy if exists "Users can view all prompts" on public.prompts;
create policy "Users can view all prompts"
  on public.prompts
  for select
  using (true);

drop policy if exists "Users can insert their own prompts" on public.prompts;
create policy "Users can insert their own prompts"
  on public.prompts
  for insert
  with check (true);

drop policy if exists "Users can update their own prompts" on public.prompts;
create policy "Users can update their own prompts"
  on public.prompts
  for update
  using (true)
  with check (true);

drop policy if exists "Users can delete their own prompts" on public.prompts;
create policy "Users can delete their own prompts"
  on public.prompts
  for delete
  using (true);

create index if not exists idx_prompts_name on public.prompts(name);
create index if not exists idx_prompts_title on public.prompts(title);
create index if not exists idx_prompts_keywords on public.prompts using gin(keywords);
create index if not exists idx_prompts_created_at on public.prompts(created_at desc);
create index if not exists idx_prompts_updated_at on public.prompts(updated_at desc);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_prompts_updated_at on public.prompts;
create trigger update_prompts_updated_at
before update on public.prompts
for each row
execute function public.update_updated_at_column();

alter publication supabase_realtime add table public.prompts;
```

## Required Supabase Project Settings

- In `Project Settings -> API`, copy:
  - `Project URL`
  - `anon public key`
- Put them in your app env (as used by this project):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Why this matches the current app

- App reads/writes `id`, `title`, `content`, `keywords`, `created_at`, `updated_at`.
- App uses `upsert` and orders by `updated_at`.
- App subscribes to realtime changes on `prompts`, so viewers (non-admin too) see admin updates automatically.

