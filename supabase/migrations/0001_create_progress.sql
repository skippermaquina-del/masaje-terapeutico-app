create table if not exists public.progress (
  id bigint generated always as identity primary key,
  user_name text not null,
  topic_slug text not null,
  completed boolean not null default false,
  quiz_score integer,
  quiz_total integer,
  updated_at timestamptz not null default now(),
  unique (user_name, topic_slug)
);

alter table public.progress enable row level security;

-- The app has no real auth (just a display name typed once and stored in
-- localStorage), so these policies can't scope rows per-user — anyone with
-- the public anon key can read/write this table. That matches how the
-- client already works (see src/lib/data.ts); it's an explicit tradeoff,
-- not an oversight. No delete policy is defined, so row deletion stays
-- blocked even though the anon role has table-level DELETE grants by default.
create policy "anon can read progress"
  on public.progress for select
  to anon
  using (true);

create policy "anon can insert progress"
  on public.progress for insert
  to anon
  with check (true);

create policy "anon can update progress"
  on public.progress for update
  to anon
  using (true)
  with check (true);
