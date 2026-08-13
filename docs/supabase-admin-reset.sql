create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "app_admins_select_self" on public.app_admins;
create policy "app_admins_select_self"
on public.app_admins
for select
to authenticated
using (user_id = auth.uid());

-- Run this after registering the admin account.
-- Replace `admin_account` with the custom account shown in the app login form.
insert into public.app_admins (user_id)
select id
from auth.users
where email = 'admin_account@feedinglog.local'
on conflict (user_id) do nothing;
