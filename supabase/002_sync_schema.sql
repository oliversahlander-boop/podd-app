create extension if not exists pgcrypto;

create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  thumbnail_url text,
  publishing_defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.podcasts
add column if not exists name text;

alter table public.podcasts
add column if not exists thumbnail_url text;

alter table public.podcasts
add column if not exists publishing_defaults jsonb not null default '{}'::jsonb;

alter table public.podcasts
add column if not exists created_at timestamptz not null default now();

alter table public.podcasts
add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  theme text not null default 'dark',
  notification_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists display_name text;

alter table public.profiles
add column if not exists avatar_url text;

alter table public.profiles
add column if not exists theme text not null default 'dark';

alter table public.profiles
add column if not exists notification_settings jsonb not null default '{}'::jsonb;

alter table public.profiles
add column if not exists created_at timestamptz not null default now();

alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.podcast_members (
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (podcast_id, user_id)
);

alter table public.podcast_members
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.podcast_members
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.podcast_members
add column if not exists role text not null default 'viewer';

alter table public.podcast_members
add column if not exists created_at timestamptz not null default now();

alter table public.podcast_members
alter column role set default 'viewer';

update public.podcast_members
set role = 'viewer'
where role = 'member';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'podcast_members_pkey'
      and conrelid = 'public.podcast_members'::regclass
  ) then
    alter table public.podcast_members
    add constraint podcast_members_pkey primary key (podcast_id, user_id);
  end if;
end;
$$;

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid references public.podcasts(id) on delete cascade,
  title text not null,
  description text,
  status text,
  notes text,
  links text,
  script text,
  segments jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '{}'::jsonb,
  checklist_state jsonb not null default '{}'::jsonb,
  responsible_person text,
  recording_date date,
  spotify_link text,
  spotify_url text,
  apple_podcasts_link text,
  youtube_link text,
  youtube_url text,
  tiktok_link text,
  tiktok_url text,
  publish_date date,
  publish_status text not null default 'draft',
  rss_status text not null default 'not_ready',
  final_artwork_url text,
  episode_duration text,
  publishing_checklist jsonb not null default '{}'::jsonb,
  publish_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.episodes
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.episodes
add column if not exists title text;

alter table public.episodes
add column if not exists description text;

alter table public.episodes
add column if not exists status text;

alter table public.episodes
add column if not exists notes text;

alter table public.episodes
add column if not exists links text;

alter table public.episodes
add column if not exists script text;

alter table public.episodes
add column if not exists segments jsonb not null default '[]'::jsonb;

alter table public.episodes
add column if not exists checklist jsonb not null default '{}'::jsonb;

alter table public.episodes
add column if not exists checklist_state jsonb not null default '{}'::jsonb;

alter table public.episodes
add column if not exists responsible_person text;

alter table public.episodes
add column if not exists recording_date date;

alter table public.episodes
add column if not exists spotify_link text;

alter table public.episodes
add column if not exists spotify_url text;

alter table public.episodes
add column if not exists apple_podcasts_link text;

alter table public.episodes
add column if not exists youtube_link text;

alter table public.episodes
add column if not exists youtube_url text;

alter table public.episodes
add column if not exists tiktok_link text;

alter table public.episodes
add column if not exists tiktok_url text;

alter table public.episodes
add column if not exists publish_date date;

alter table public.episodes
add column if not exists publish_status text not null default 'draft';

alter table public.episodes
add column if not exists rss_status text not null default 'not_ready';

alter table public.episodes
add column if not exists final_artwork_url text;

alter table public.episodes
add column if not exists episode_duration text;

alter table public.episodes
add column if not exists publishing_checklist jsonb not null default '{}'::jsonb;

alter table public.episodes
add column if not exists publish_history jsonb not null default '[]'::jsonb;

alter table public.episodes
add column if not exists created_at timestamptz not null default now();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid references public.podcasts(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  target_url text,
  created_at timestamptz not null default now()
);

alter table public.notifications
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.notifications
add column if not exists actor_id uuid references auth.users(id) on delete set null;

alter table public.notifications
add column if not exists type text;

alter table public.notifications
add column if not exists title text;

alter table public.notifications
add column if not exists body text;

alter table public.notifications
add column if not exists target_url text;

alter table public.notifications
add column if not exists created_at timestamptz not null default now();

create table if not exists public.notification_reads (
  notification_id uuid references public.notifications(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.notification_reads
add column if not exists notification_id uuid references public.notifications(id) on delete cascade;

alter table public.notification_reads
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.notification_reads
add column if not exists read_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_reads_pkey'
      and conrelid = 'public.notification_reads'::regclass
  ) then
    alter table public.notification_reads
    add constraint notification_reads_pkey primary key (notification_id, user_id);
  end if;
end;
$$;

create table if not exists public.production_files (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  category text not null,
  filename text not null,
  file_path text not null,
  public_url text not null,
  content_type text,
  size_bytes bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.production_files
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.production_files
add column if not exists episode_id uuid references public.episodes(id) on delete cascade;

alter table public.production_files
add column if not exists category text;

alter table public.production_files
add column if not exists filename text;

alter table public.production_files
add column if not exists file_path text;

alter table public.production_files
add column if not exists public_url text;

alter table public.production_files
add column if not exists content_type text;

alter table public.production_files
add column if not exists size_bytes bigint not null default 0;

alter table public.production_files
add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

alter table public.production_files
add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'podcasts_created_by_fkey'
      and conrelid = 'public.podcasts'::regclass
  ) then
    alter table public.podcasts
    add constraint podcasts_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'podcast_members_podcast_id_fkey'
      and conrelid = 'public.podcast_members'::regclass
  ) then
    alter table public.podcast_members
    add constraint podcast_members_podcast_id_fkey
    foreign key (podcast_id) references public.podcasts(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'podcast_members_user_id_fkey'
      and conrelid = 'public.podcast_members'::regclass
  ) then
    alter table public.podcast_members
    add constraint podcast_members_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'episodes_podcast_id_fkey'
      and conrelid = 'public.episodes'::regclass
  ) then
    alter table public.episodes
    add constraint episodes_podcast_id_fkey
    foreign key (podcast_id) references public.podcasts(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_podcast_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
    add constraint notifications_podcast_id_fkey
    foreign key (podcast_id) references public.podcasts(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_actor_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
    add constraint notifications_actor_id_fkey
    foreign key (actor_id) references auth.users(id) on delete set null not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_reads_notification_id_fkey'
      and conrelid = 'public.notification_reads'::regclass
  ) then
    alter table public.notification_reads
    add constraint notification_reads_notification_id_fkey
    foreign key (notification_id) references public.notifications(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_reads_user_id_fkey'
      and conrelid = 'public.notification_reads'::regclass
  ) then
    alter table public.notification_reads
    add constraint notification_reads_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'production_files_podcast_id_fkey'
      and conrelid = 'public.production_files'::regclass
  ) then
    alter table public.production_files
    add constraint production_files_podcast_id_fkey
    foreign key (podcast_id) references public.podcasts(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'production_files_episode_id_fkey'
      and conrelid = 'public.production_files'::regclass
  ) then
    alter table public.production_files
    add constraint production_files_episode_id_fkey
    foreign key (episode_id) references public.episodes(id) on delete cascade not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'production_files_uploaded_by_fkey'
      and conrelid = 'public.production_files'::regclass
  ) then
    alter table public.production_files
    add constraint production_files_uploaded_by_fkey
    foreign key (uploaded_by) references auth.users(id) on delete set null not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'podcast_members_role_check'
      and conrelid = 'public.podcast_members'::regclass
  ) then
    alter table public.podcast_members
    add constraint podcast_members_role_check
    check (role in ('owner', 'admin', 'editor', 'viewer')) not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'episodes_publish_status_check'
      and conrelid = 'public.episodes'::regclass
  ) then
    alter table public.episodes
    add constraint episodes_publish_status_check
    check (publish_status in ('draft', 'ready', 'scheduled', 'published')) not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'episodes_rss_status_check'
      and conrelid = 'public.episodes'::regclass
  ) then
    alter table public.episodes
    add constraint episodes_rss_status_check
    check (rss_status in ('not_ready', 'valid', 'published')) not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'production_files_category_check'
      and conrelid = 'public.production_files'::regclass
  ) then
    alter table public.production_files
    add constraint production_files_category_check
    check (category in ('raw', 'edited', 'final')) not valid;
  end if;
end;
$$;

create index if not exists podcasts_created_by_idx
on public.podcasts(created_by);

create index if not exists episodes_podcast_id_idx
on public.episodes(podcast_id);

create index if not exists episodes_podcast_id_created_at_idx
on public.episodes(podcast_id, created_at desc);

create index if not exists episodes_status_idx
on public.episodes(status);

create index if not exists podcast_members_user_id_idx
on public.podcast_members(user_id);

create index if not exists podcast_members_podcast_id_idx
on public.podcast_members(podcast_id);

create index if not exists notifications_podcast_id_created_at_idx
on public.notifications(podcast_id, created_at desc);

create index if not exists notification_reads_user_id_idx
on public.notification_reads(user_id);

create index if not exists production_files_episode_id_created_at_idx
on public.production_files(episode_id, created_at desc);

create index if not exists production_files_podcast_id_created_at_idx
on public.production_files(podcast_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('episodes-material', 'episodes-material', true)
on conflict (id) do update
set public = excluded.public;

alter table public.podcasts enable row level security;
alter table public.podcast_members enable row level security;
alter table public.profiles enable row level security;
alter table public.episodes enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.production_files enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.episodes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.production_files;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

create or replace function public.current_podcast_role(target_podcast_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.podcast_members
  where podcast_id = target_podcast_id
    and user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_podcast_role(uuid) to authenticated;

drop policy if exists "Users can view their own profile"
on public.profiles;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can create their own profile"
on public.profiles;

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile"
on public.profiles;

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can create podcasts"
on public.podcasts;

create policy "Users can create podcasts"
on public.podcasts
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Members can view podcasts"
on public.podcasts;

create policy "Members can view podcasts"
on public.podcasts
for select
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = podcasts.id
      and podcast_members.user_id = auth.uid()
  )
);

drop policy if exists "Owners and admins can update podcasts"
on public.podcasts;

drop policy if exists "Owners can update podcasts"
on public.podcasts;

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

drop policy if exists "Owners can delete podcasts"
on public.podcasts;

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

drop policy if exists "Users can add themselves as members"
on public.podcast_members;

create policy "Users can add themselves as members"
on public.podcast_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.podcasts
    where podcasts.id = podcast_members.podcast_id
      and podcasts.created_by = auth.uid()
  )
);

drop policy if exists "Members can view members"
on public.podcast_members;

create policy "Members can view members"
on public.podcast_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_podcast_role(podcast_id) in ('owner', 'admin', 'editor', 'viewer')
);

drop policy if exists "Owners can remove podcast members"
on public.podcast_members;

create policy "Owners can remove podcast members"
on public.podcast_members
for delete
to authenticated
using (
  user_id <> auth.uid()
  and public.current_podcast_role(podcast_id) = 'owner'
);

drop policy if exists "Members can leave podcasts"
on public.podcast_members;

create policy "Members can leave podcasts"
on public.podcast_members
for delete
to authenticated
using (
  user_id = auth.uid()
  and role <> 'owner'
);

drop policy if exists "Owners can update podcast member roles"
on public.podcast_members;

create policy "Owners can update podcast member roles"
on public.podcast_members
for update
to authenticated
using (
  user_id <> auth.uid()
  and public.current_podcast_role(podcast_id) = 'owner'
)
with check (
  user_id <> auth.uid()
  and role in ('owner', 'admin', 'editor', 'viewer')
  and public.current_podcast_role(podcast_id) = 'owner'
);

drop policy if exists "Owners and admins can add podcast members"
on public.podcast_members;

drop policy if exists "Owners can add podcast members"
on public.podcast_members;

create policy "Owners and admins can add podcast members"
on public.podcast_members
for insert
to authenticated
with check (
  public.current_podcast_role(podcast_id) in ('owner', 'admin')
);

drop policy if exists "Members can view podcast episodes"
on public.episodes;

create policy "Members can view podcast episodes"
on public.episodes
for select
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episodes.podcast_id
      and podcast_members.user_id = auth.uid()
  )
);

drop policy if exists "Editors can create podcast episodes"
on public.episodes;

create policy "Editors can create podcast episodes"
on public.episodes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episodes.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can update podcast episodes"
on public.episodes;

create policy "Editors can update podcast episodes"
on public.episodes
for update
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episodes.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episodes.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can delete podcast episodes"
on public.episodes;

create policy "Editors can delete podcast episodes"
on public.episodes
for delete
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episodes.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Members can view podcast notifications"
on public.notifications;

create policy "Members can view podcast notifications"
on public.notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = notifications.podcast_id
      and podcast_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can create podcast notifications"
on public.notifications;

create policy "Members can create podcast notifications"
on public.notifications
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = notifications.podcast_id
      and podcast_members.user_id = auth.uid()
  )
);

drop policy if exists "Users can view their notification reads"
on public.notification_reads;

create policy "Users can view their notification reads"
on public.notification_reads
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their notification reads"
on public.notification_reads;

create policy "Users can create their notification reads"
on public.notification_reads
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their notification reads"
on public.notification_reads;

create policy "Users can update their notification reads"
on public.notification_reads
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Members can view production files"
on public.production_files;

create policy "Members can view production files"
on public.production_files
for select
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = production_files.podcast_id
      and podcast_members.user_id = auth.uid()
  )
);

drop policy if exists "Editors can create production files"
on public.production_files;

create policy "Editors can create production files"
on public.production_files
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = production_files.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can delete production files"
on public.production_files;

create policy "Editors can delete production files"
on public.production_files
for delete
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = production_files.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Members can view episode materials bucket"
on storage.objects;

create policy "Members can view episode materials bucket"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'episodes-material'
  and (
    name like 'profiles/' || auth.uid()::text || '/%'
    or exists (
      select 1
      from public.podcast_members
      where name like 'podcasts/' || podcast_members.podcast_id::text || '/%'
        and podcast_members.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.episodes
      join public.podcast_members on podcast_members.podcast_id = episodes.podcast_id
      where name like 'episodes/' || episodes.id::text || '/%'
        and podcast_members.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can upload own profile materials"
on storage.objects;

create policy "Users can upload own profile materials"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'episodes-material'
  and name like 'profiles/' || auth.uid()::text || '/%'
);

drop policy if exists "Managers can upload podcast materials"
on storage.objects;

create policy "Managers can upload podcast materials"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'episodes-material'
  and exists (
    select 1
    from public.podcast_members
    where name like 'podcasts/' || podcast_members.podcast_id::text || '/%'
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin')
  )
);

drop policy if exists "Editors can upload episode materials"
on storage.objects;

create policy "Editors can upload episode materials"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'episodes-material'
  and exists (
    select 1
    from public.episodes
    join public.podcast_members on podcast_members.podcast_id = episodes.podcast_id
    where name like 'episodes/' || episodes.id::text || '/%'
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Users can update own profile materials"
on storage.objects;

create policy "Users can update own profile materials"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'episodes-material'
  and name like 'profiles/' || auth.uid()::text || '/%'
)
with check (
  bucket_id = 'episodes-material'
  and name like 'profiles/' || auth.uid()::text || '/%'
);

drop policy if exists "Managers can update podcast materials"
on storage.objects;

create policy "Managers can update podcast materials"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'episodes-material'
  and exists (
    select 1
    from public.podcast_members
    where name like 'podcasts/' || podcast_members.podcast_id::text || '/%'
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin')
  )
)
with check (
  bucket_id = 'episodes-material'
  and exists (
    select 1
    from public.podcast_members
    where name like 'podcasts/' || podcast_members.podcast_id::text || '/%'
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin')
  )
);

drop policy if exists "Editors can update episode materials"
on storage.objects;

create policy "Editors can update episode materials"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'episodes-material'
  and exists (
    select 1
    from public.episodes
    join public.podcast_members on podcast_members.podcast_id = episodes.podcast_id
    where name like 'episodes/' || episodes.id::text || '/%'
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
)
with check (
  bucket_id = 'episodes-material'
  and exists (
    select 1
    from public.episodes
    join public.podcast_members on podcast_members.podcast_id = episodes.podcast_id
    where name like 'episodes/' || episodes.id::text || '/%'
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can delete episode materials"
on storage.objects;

create policy "Editors can delete episode materials"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'episodes-material'
  and exists (
    select 1
    from public.episodes
    join public.podcast_members on podcast_members.podcast_id = episodes.podcast_id
    where name like 'episodes/' || episodes.id::text || '/%'
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop function if exists public.add_podcast_member_by_email(uuid, text);

create or replace function public.add_podcast_member_by_email(
  target_podcast_id uuid,
  target_email text
)
returns table (
  podcast_id uuid,
  user_id uuid,
  role text,
  email text,
  display_name text
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
    raise exception 'Endast ägare och administratörer kan lägga till medlemmar';
  end if;

  select users.id
  into target_user_id
  from auth.users
  where lower(users.email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'Användaren hittades inte';
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
    auth.users.email::text,
    public.profiles.display_name
  from public.podcast_members
  join auth.users on auth.users.id = public.podcast_members.user_id
  left join public.profiles on public.profiles.id = public.podcast_members.user_id
  where public.podcast_members.podcast_id = target_podcast_id
    and public.podcast_members.user_id = target_user_id;
end;
$$;

drop function if exists public.get_podcast_members(uuid);

create or replace function public.get_podcast_members(target_podcast_id uuid)
returns table (
  podcast_id uuid,
  user_id uuid,
  role text,
  email text,
  display_name text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    public.podcast_members.podcast_id,
    public.podcast_members.user_id,
    public.podcast_members.role,
    auth.users.email::text,
    public.profiles.display_name
  from public.podcast_members
  join auth.users on auth.users.id = public.podcast_members.user_id
  left join public.profiles on public.profiles.id = public.podcast_members.user_id
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
    raise exception 'Endast ägare kan ta bort podcaster';
  end if;

  delete from public.production_files
  where production_files.podcast_id = target_podcast_id;

  delete from public.notifications
  where notifications.podcast_id = target_podcast_id;

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
