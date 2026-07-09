create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.podcasts
add column if not exists thumbnail_url text;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists avatar_url text;

alter table public.profiles
add column if not exists theme text not null default 'dark';

create table if not exists public.podcast_members (
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (podcast_id, user_id)
);

alter table public.podcast_members
alter column role set default 'viewer';

update public.podcast_members
set role = 'viewer'
where role = 'member';

alter table public.episodes
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.episodes
add column if not exists script text;

alter table public.episodes
add column if not exists checklist_state jsonb not null default '{}'::jsonb;

alter table public.episodes
add column if not exists responsible_person text;

alter table public.episodes
add column if not exists recording_date date;

alter table public.episodes
add column if not exists spotify_link text;

alter table public.episodes
add column if not exists youtube_link text;

alter table public.episodes
add column if not exists tiktok_link text;

alter table public.episodes
add column if not exists publish_date date;

create index if not exists episodes_podcast_id_idx on public.episodes(podcast_id);
create index if not exists podcast_members_user_id_idx on public.podcast_members(user_id);

alter table public.podcasts enable row level security;
alter table public.podcast_members enable row level security;
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can create podcasts"
on public.podcasts
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Members can view podcasts"
on public.podcasts
for select
to authenticated
using (
  created_by = auth.uid()
  or
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = podcasts.id
      and podcast_members.user_id = auth.uid()
  )
);

create policy "Owners and admins can update podcasts"
on public.podcasts
for update
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = podcasts.id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = podcasts.id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin')
  )
);

create policy "Owners can delete podcasts"
on public.podcasts
for delete
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = podcasts.id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role = 'owner'
  )
);

create policy "Users can add themselves as members"
on public.podcast_members
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Members can view members"
on public.podcast_members
for select
to authenticated
using (user_id = auth.uid());

create policy "Owners and admins can remove podcast members"
on public.podcast_members
for delete
to authenticated
using (
  user_id <> auth.uid()
  and (
    podcast_members.role <> 'owner'
    or exists (
      select 1
      from public.podcast_members owner_membership
      where owner_membership.podcast_id = podcast_members.podcast_id
        and owner_membership.user_id = auth.uid()
        and owner_membership.role = 'owner'
    )
  )
  and exists (
    select 1
    from public.podcast_members manager_membership
    where manager_membership.podcast_id = podcast_members.podcast_id
      and manager_membership.user_id = auth.uid()
      and manager_membership.role in ('owner', 'admin')
  )
);

create policy "Owners can update podcast member roles"
on public.podcast_members
for update
to authenticated
using (
  user_id <> auth.uid()
  and exists (
    select 1
    from public.podcast_members owner_membership
    where owner_membership.podcast_id = podcast_members.podcast_id
      and owner_membership.user_id = auth.uid()
      and owner_membership.role = 'owner'
  )
)
with check (
  user_id <> auth.uid()
  and role in ('owner', 'admin', 'editor', 'viewer')
  and exists (
    select 1
    from public.podcast_members owner_membership
    where owner_membership.podcast_id = podcast_members.podcast_id
      and owner_membership.user_id = auth.uid()
      and owner_membership.role = 'owner'
  )
);

create policy "Members can leave podcasts"
on public.podcast_members
for delete
to authenticated
using (
  user_id = auth.uid()
  and role <> 'owner'
);

create policy "Owners and admins can add podcast members"
on public.podcast_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.podcast_members manager_membership
    where manager_membership.podcast_id = podcast_members.podcast_id
      and manager_membership.user_id = auth.uid()
      and manager_membership.role in ('owner', 'admin')
  )
);

create or replace function public.add_podcast_member_by_email(
  target_podcast_id uuid,
  target_email text
)
returns table (
  podcast_id uuid,
  user_id uuid,
  role text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  if not exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = target_podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin')
  ) then
    raise exception 'Only owners and admins can add members';
  end if;

  select users.id
  into target_user_id
  from auth.users
  where lower(users.email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'User not found';
  end if;

  insert into public.podcast_members (podcast_id, user_id, role)
  values (target_podcast_id, target_user_id, 'viewer')
  on conflict (podcast_id, user_id) do update
  set role = public.podcast_members.role;

  return query
  select
    public.podcast_members.podcast_id,
    public.podcast_members.user_id,
    public.podcast_members.role,
    auth.users.email::text
  from public.podcast_members
  join auth.users on auth.users.id = public.podcast_members.user_id
  where public.podcast_members.podcast_id = target_podcast_id
    and public.podcast_members.user_id = target_user_id;
end;
$$;

create or replace function public.get_podcast_members(target_podcast_id uuid)
returns table (
  podcast_id uuid,
  user_id uuid,
  role text,
  email text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    public.podcast_members.podcast_id,
    public.podcast_members.user_id,
    public.podcast_members.role,
    auth.users.email::text
  from public.podcast_members
  join auth.users on auth.users.id = public.podcast_members.user_id
  where public.podcast_members.podcast_id = target_podcast_id
    and exists (
      select 1
      from public.podcast_members current_member
      where current_member.podcast_id = target_podcast_id
        and current_member.user_id = auth.uid()
    );
$$;

create or replace function public.delete_podcast(target_podcast_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = target_podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role = 'owner'
  ) then
    raise exception 'Only owners can delete podcasts';
  end if;

  delete from public.episodes
  where episodes.podcast_id = target_podcast_id;

  delete from public.podcast_members
  where podcast_members.podcast_id = target_podcast_id;

  delete from public.podcasts
  where podcasts.id = target_podcast_id;
end;
$$;

grant execute on function public.add_podcast_member_by_email(uuid, text) to authenticated;
grant execute on function public.get_podcast_members(uuid) to authenticated;
grant execute on function public.delete_podcast(uuid) to authenticated;
