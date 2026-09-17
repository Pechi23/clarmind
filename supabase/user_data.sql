-- Cloud sync table for ClarMind. One JSON blob per user (their whole app state:
-- birth details, streaks, sessions, moods, prefs, leaderboard device id).
-- Row Level Security ensures each user can only read/write their own row.
-- Apply in Supabase: SQL Editor -> paste -> Run.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "user_data_select_own" on public.user_data
  for select using (auth.uid() = user_id);

create policy "user_data_insert_own" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "user_data_update_own" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
