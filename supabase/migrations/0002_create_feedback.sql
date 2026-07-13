create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_name text,
  message text not null,
  page_context text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Unlike `progress`, feedback is write-only for anon: anyone can submit
-- feedback, but only the project owner (reading directly via the Supabase
-- dashboard, not through the app) can see submissions. No select/update/
-- delete policy is defined for anon, so those stay blocked.
create policy "anon can insert feedback"
  on public.feedback for insert
  to anon
  with check (message is not null and length(trim(message)) > 0);
