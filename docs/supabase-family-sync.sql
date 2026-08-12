create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.feeding_records (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  fed_at timestamptz not null,
  amount_ml integer not null check (amount_ml > 0),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index if not exists family_members_user_id_idx on public.family_members(user_id);
create index if not exists feeding_records_family_fed_at_idx on public.feeding_records(family_id, fed_at);
create index if not exists feeding_records_family_updated_at_idx on public.feeding_records(family_id, updated_at);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.feeding_records enable row level security;

create or replace function public.is_family_member(family_id_arg uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members member
    where member.family_id = family_id_arg
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.create_family(name_arg text, invite_code_arg text)
returns table(id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  family_id uuid;
begin
  insert into public.families(name, invite_code, created_by)
  values (name_arg, upper(invite_code_arg), auth.uid())
  returning families.id into family_id;

  insert into public.family_members(family_id, user_id, role)
  values (family_id, auth.uid(), 'owner');

  return query
    select families.id, families.name, families.invite_code
    from public.families
    where families.id = family_id;
end;
$$;

create or replace function public.join_family_by_invite(invite_code_arg text)
returns table(id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  family_id uuid;
begin
  select families.id
  into family_id
  from public.families
  where families.invite_code = upper(trim(invite_code_arg));

  if family_id is null then
    raise exception 'family invite code not found';
  end if;

  insert into public.family_members(family_id, user_id, role)
  values (family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  return query
    select families.id, families.name, families.invite_code
    from public.families
    where families.id = family_id;
end;
$$;

grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family_by_invite(text) to authenticated;

drop policy if exists "families_select_member_or_invite" on public.families;
create policy "families_select_member_or_invite"
on public.families
for select
to authenticated
using (public.is_family_member(id));

drop policy if exists "families_insert_owner" on public.families;
create policy "families_insert_owner"
on public.families
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "family_members_select_self_family" on public.family_members;
create policy "family_members_select_self_family"
on public.family_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_family_member(family_id)
);

drop policy if exists "family_members_insert_self" on public.family_members;

drop policy if exists "feeding_records_select_family_members" on public.feeding_records;
create policy "feeding_records_select_family_members"
on public.feeding_records
for select
to authenticated
using (public.is_family_member(family_id));

drop policy if exists "feeding_records_insert_family_members" on public.feeding_records;
create policy "feeding_records_insert_family_members"
on public.feeding_records
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.is_family_member(family_id)
);

drop policy if exists "feeding_records_update_family_members" on public.feeding_records;
create policy "feeding_records_update_family_members"
on public.feeding_records
for update
to authenticated
using (public.is_family_member(family_id))
with check (
  updated_by = auth.uid()
  and public.is_family_member(family_id)
);

alter publication supabase_realtime add table public.feeding_records;
