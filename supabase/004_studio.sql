create extension if not exists pgcrypto;

create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  duration_seconds numeric not null default 0,
  sample_rate integer not null default 48000,
  channel_mode text not null default 'stereo',
  zoom numeric not null default 120,
  playhead_seconds numeric not null default 0,
  selection_start numeric,
  selection_end numeric,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_projects add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;
alter table public.studio_projects add column if not exists episode_id uuid references public.episodes(id) on delete cascade;
alter table public.studio_projects add column if not exists name text;
alter table public.studio_projects add column if not exists version integer not null default 1;
alter table public.studio_projects add column if not exists duration_seconds numeric not null default 0;
alter table public.studio_projects add column if not exists sample_rate integer not null default 48000;
alter table public.studio_projects add column if not exists channel_mode text not null default 'stereo';
alter table public.studio_projects add column if not exists zoom numeric not null default 120;
alter table public.studio_projects add column if not exists playhead_seconds numeric not null default 0;
alter table public.studio_projects add column if not exists selection_start numeric;
alter table public.studio_projects add column if not exists selection_end numeric;
alter table public.studio_projects add column if not exists status text not null default 'draft';
alter table public.studio_projects add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.studio_projects add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.studio_projects add column if not exists created_at timestamptz not null default now();
alter table public.studio_projects add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_projects_episode_unique'
      and conrelid = 'public.studio_projects'::regclass
  ) then
    alter table public.studio_projects
    add constraint studio_projects_episode_unique unique (episode_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_projects_channel_mode_check'
      and conrelid = 'public.studio_projects'::regclass
  ) then
    alter table public.studio_projects
    add constraint studio_projects_channel_mode_check
    check (channel_mode in ('mono', 'stereo')) not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_projects_status_check'
      and conrelid = 'public.studio_projects'::regclass
  ) then
    alter table public.studio_projects
    add constraint studio_projects_status_check
    check (status in ('draft', 'active', 'archived')) not valid;
  end if;
end;
$$;

create table if not exists public.studio_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  name text not null,
  type text not null default 'microphone',
  assigned_user_id uuid references auth.users(id) on delete set null,
  input_device_id text,
  output_device_id text,
  channel_mode text not null default 'mono',
  volume numeric not null default 1,
  pan numeric not null default 0,
  muted boolean not null default false,
  solo boolean not null default false,
  armed boolean not null default false,
  monitoring boolean not null default false,
  track_order integer not null default 0,
  height integer not null default 128,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_tracks add column if not exists project_id uuid references public.studio_projects(id) on delete cascade;
alter table public.studio_tracks add column if not exists name text;
alter table public.studio_tracks add column if not exists type text not null default 'microphone';
alter table public.studio_tracks add column if not exists assigned_user_id uuid references auth.users(id) on delete set null;
alter table public.studio_tracks add column if not exists input_device_id text;
alter table public.studio_tracks add column if not exists output_device_id text;
alter table public.studio_tracks add column if not exists channel_mode text not null default 'mono';
alter table public.studio_tracks add column if not exists volume numeric not null default 1;
alter table public.studio_tracks add column if not exists pan numeric not null default 0;
alter table public.studio_tracks add column if not exists muted boolean not null default false;
alter table public.studio_tracks add column if not exists solo boolean not null default false;
alter table public.studio_tracks add column if not exists armed boolean not null default false;
alter table public.studio_tracks add column if not exists monitoring boolean not null default false;
alter table public.studio_tracks add column if not exists track_order integer not null default 0;
alter table public.studio_tracks add column if not exists height integer not null default 128;
alter table public.studio_tracks add column if not exists created_at timestamptz not null default now();
alter table public.studio_tracks add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_tracks_type_check'
      and conrelid = 'public.studio_tracks'::regclass
  ) then
    alter table public.studio_tracks
    add constraint studio_tracks_type_check
    check (type in ('microphone', 'imported_audio', 'music', 'sound_effect')) not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_tracks_channel_mode_check'
      and conrelid = 'public.studio_tracks'::regclass
  ) then
    alter table public.studio_tracks
    add constraint studio_tracks_channel_mode_check
    check (channel_mode in ('mono', 'stereo')) not valid;
  end if;
end;
$$;

create table if not exists public.studio_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  category text not null,
  filename text not null,
  file_path text not null,
  public_url text,
  content_type text,
  size_bytes bigint not null default 0,
  duration_seconds numeric,
  sample_rate integer,
  channel_count integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.studio_files add column if not exists project_id uuid references public.studio_projects(id) on delete cascade;
alter table public.studio_files add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;
alter table public.studio_files add column if not exists episode_id uuid references public.episodes(id) on delete cascade;
alter table public.studio_files add column if not exists category text;
alter table public.studio_files add column if not exists filename text;
alter table public.studio_files add column if not exists file_path text;
alter table public.studio_files add column if not exists public_url text;
alter table public.studio_files add column if not exists content_type text;
alter table public.studio_files add column if not exists size_bytes bigint not null default 0;
alter table public.studio_files add column if not exists duration_seconds numeric;
alter table public.studio_files add column if not exists sample_rate integer;
alter table public.studio_files add column if not exists channel_count integer;
alter table public.studio_files add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.studio_files add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_files_category_check'
      and conrelid = 'public.studio_files'::regclass
  ) then
    alter table public.studio_files
    add constraint studio_files_category_check
    check (category in ('recordings', 'imported', 'music', 'sound-effects', 'exports')) not valid;
  end if;
end;
$$;

create table if not exists public.studio_clips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  track_id uuid not null references public.studio_tracks(id) on delete cascade,
  name text not null,
  source_file_id uuid references public.studio_files(id) on delete set null,
  start_time numeric not null default 0,
  source_offset numeric not null default 0,
  duration numeric not null default 0,
  gain numeric not null default 1,
  fade_in numeric not null default 0,
  fade_out numeric not null default 0,
  muted boolean not null default false,
  locked boolean not null default false,
  clip_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_clips add column if not exists project_id uuid references public.studio_projects(id) on delete cascade;
alter table public.studio_clips add column if not exists track_id uuid references public.studio_tracks(id) on delete cascade;
alter table public.studio_clips add column if not exists name text;
alter table public.studio_clips add column if not exists source_file_id uuid references public.studio_files(id) on delete set null;
alter table public.studio_clips add column if not exists start_time numeric not null default 0;
alter table public.studio_clips add column if not exists source_offset numeric not null default 0;
alter table public.studio_clips add column if not exists duration numeric not null default 0;
alter table public.studio_clips add column if not exists gain numeric not null default 1;
alter table public.studio_clips add column if not exists fade_in numeric not null default 0;
alter table public.studio_clips add column if not exists fade_out numeric not null default 0;
alter table public.studio_clips add column if not exists muted boolean not null default false;
alter table public.studio_clips add column if not exists locked boolean not null default false;
alter table public.studio_clips add column if not exists clip_order integer not null default 0;
alter table public.studio_clips add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.studio_clips add column if not exists created_at timestamptz not null default now();
alter table public.studio_clips add column if not exists updated_at timestamptz not null default now();

create table if not exists public.studio_markers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  title text not null,
  position_seconds numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_markers add column if not exists project_id uuid references public.studio_projects(id) on delete cascade;
alter table public.studio_markers add column if not exists title text;
alter table public.studio_markers add column if not exists position_seconds numeric not null default 0;
alter table public.studio_markers add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.studio_markers add column if not exists created_at timestamptz not null default now();
alter table public.studio_markers add column if not exists updated_at timestamptz not null default now();

create table if not exists public.studio_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.studio_versions add column if not exists project_id uuid references public.studio_projects(id) on delete cascade;
alter table public.studio_versions add column if not exists version_number integer;
alter table public.studio_versions add column if not exists snapshot jsonb not null default '{}'::jsonb;
alter table public.studio_versions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.studio_versions add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_versions_project_version_unique'
      and conrelid = 'public.studio_versions'::regclass
  ) then
    alter table public.studio_versions
    add constraint studio_versions_project_version_unique unique (project_id, version_number);
  end if;
end;
$$;

create table if not exists public.studio_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.studio_activity add column if not exists project_id uuid references public.studio_projects(id) on delete cascade;
alter table public.studio_activity add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;
alter table public.studio_activity add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.studio_activity add column if not exists action_type text;
alter table public.studio_activity add column if not exists description text;
alter table public.studio_activity add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.studio_activity add column if not exists created_at timestamptz not null default now();

create index if not exists studio_projects_podcast_id_idx on public.studio_projects(podcast_id);
create index if not exists studio_projects_episode_id_idx on public.studio_projects(episode_id);
create index if not exists studio_projects_updated_at_idx on public.studio_projects(updated_at desc);
create index if not exists studio_tracks_project_order_idx on public.studio_tracks(project_id, track_order);
create index if not exists studio_tracks_assigned_user_id_idx on public.studio_tracks(assigned_user_id);
create index if not exists studio_clips_project_id_idx on public.studio_clips(project_id);
create index if not exists studio_clips_track_order_idx on public.studio_clips(track_id, clip_order);
create index if not exists studio_clips_source_file_id_idx on public.studio_clips(source_file_id);
create index if not exists studio_files_project_id_idx on public.studio_files(project_id);
create index if not exists studio_files_podcast_episode_idx on public.studio_files(podcast_id, episode_id);
create index if not exists studio_files_uploaded_by_idx on public.studio_files(uploaded_by);
create index if not exists studio_markers_project_position_idx on public.studio_markers(project_id, position_seconds);
create index if not exists studio_versions_project_created_at_idx on public.studio_versions(project_id, created_at desc);
create index if not exists studio_activity_project_created_at_idx on public.studio_activity(project_id, created_at desc);
create index if not exists studio_activity_podcast_created_at_idx on public.studio_activity(podcast_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('studio-files', 'studio-files', true)
on conflict (id) do update
set public = excluded.public;

alter table public.studio_projects enable row level security;
alter table public.studio_tracks enable row level security;
alter table public.studio_clips enable row level security;
alter table public.studio_files enable row level security;
alter table public.studio_markers enable row level security;
alter table public.studio_versions enable row level security;
alter table public.studio_activity enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists studio_projects_touch_updated_at on public.studio_projects;
create trigger studio_projects_touch_updated_at
before update on public.studio_projects
for each row execute function public.touch_updated_at();

drop trigger if exists studio_tracks_touch_updated_at on public.studio_tracks;
create trigger studio_tracks_touch_updated_at
before update on public.studio_tracks
for each row execute function public.touch_updated_at();

drop trigger if exists studio_clips_touch_updated_at on public.studio_clips;
create trigger studio_clips_touch_updated_at
before update on public.studio_clips
for each row execute function public.touch_updated_at();

drop trigger if exists studio_markers_touch_updated_at on public.studio_markers;
create trigger studio_markers_touch_updated_at
before update on public.studio_markers
for each row execute function public.touch_updated_at();

create or replace function public.is_podcast_member(target_podcast_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = target_podcast_id
      and podcast_members.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_podcast(target_podcast_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = target_podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  );
$$;

create or replace function public.is_podcast_owner(target_podcast_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = target_podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role = 'owner'
  );
$$;

create or replace function public.create_studio_project(
  target_podcast_id uuid,
  target_episode_id uuid,
  project_name text default null
)
returns public.studio_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  created_project public.studio_projects;
  target_episode_title text;
begin
  if not public.can_edit_podcast(target_podcast_id) then
    raise exception 'Du saknar behörighet att skapa studioprojekt';
  end if;

  select episodes.title
  into target_episode_title
  from public.episodes
  where episodes.id = target_episode_id
    and episodes.podcast_id = target_podcast_id;

  if target_episode_title is null then
    raise exception 'Avsnittet hittades inte i vald podcast';
  end if;

  insert into public.studio_projects (
    podcast_id,
    episode_id,
    name,
    created_by,
    updated_by
  )
  values (
    target_podcast_id,
    target_episode_id,
    coalesce(nullif(trim(project_name), ''), target_episode_title),
    auth.uid(),
    auth.uid()
  )
  on conflict (episode_id) do update
  set updated_at = public.studio_projects.updated_at
  returning * into created_project;

  insert into public.studio_tracks (
    project_id,
    name,
    type,
    channel_mode,
    track_order,
    armed
  )
  values (
    created_project.id,
    'Huvudspår',
    'microphone',
    'mono',
    0,
    true
  )
  on conflict do nothing;

  insert into public.studio_activity (
    project_id,
    podcast_id,
    user_id,
    action_type,
    description
  )
  values (
    created_project.id,
    target_podcast_id,
    auth.uid(),
    'project_created',
    'Studioprojekt skapades'
  );

  return created_project;
end;
$$;

create or replace function public.get_studio_project_for_episode(target_episode_id uuid)
returns table (
  project jsonb,
  tracks jsonb,
  clips jsonb,
  files jsonb,
  markers jsonb,
  versions jsonb,
  activity jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project public.studio_projects;
begin
  select *
  into target_project
  from public.studio_projects
  where studio_projects.episode_id = target_episode_id
  limit 1;

  if target_project.id is null then
    return;
  end if;

  if not public.is_podcast_member(target_project.podcast_id) then
    raise exception 'Du saknar åtkomst till studioprojektet';
  end if;

  return query
  select
    to_jsonb(target_project),
    coalesce(
      (
        select jsonb_agg(to_jsonb(studio_tracks) order by studio_tracks.track_order)
        from public.studio_tracks
        where studio_tracks.project_id = target_project.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(studio_clips) order by studio_clips.clip_order)
        from public.studio_clips
        where studio_clips.project_id = target_project.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(studio_files) order by studio_files.created_at desc)
        from public.studio_files
        where studio_files.project_id = target_project.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(studio_markers) order by studio_markers.position_seconds)
        from public.studio_markers
        where studio_markers.project_id = target_project.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(studio_versions) order by studio_versions.version_number desc)
        from public.studio_versions
        where studio_versions.project_id = target_project.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(studio_activity) order by studio_activity.created_at desc)
        from public.studio_activity
        where studio_activity.project_id = target_project.id
        limit 100
      ),
      '[]'::jsonb
    );
end;
$$;

create or replace function public.save_studio_project_version(
  target_project_id uuid,
  project_snapshot jsonb
)
returns public.studio_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project public.studio_projects;
  next_version integer;
  created_version public.studio_versions;
begin
  select *
  into target_project
  from public.studio_projects
  where studio_projects.id = target_project_id;

  if target_project.id is null then
    raise exception 'Studioprojektet hittades inte';
  end if;

  if not public.can_edit_podcast(target_project.podcast_id) then
    raise exception 'Du saknar behörighet att spara studioprojektet';
  end if;

  select coalesce(max(version_number), 0) + 1
  into next_version
  from public.studio_versions
  where studio_versions.project_id = target_project_id;

  insert into public.studio_versions (
    project_id,
    version_number,
    snapshot,
    created_by
  )
  values (
    target_project_id,
    next_version,
    coalesce(project_snapshot, '{}'::jsonb),
    auth.uid()
  )
  returning * into created_version;

  update public.studio_projects
  set version = next_version,
      updated_by = auth.uid()
  where studio_projects.id = target_project_id;

  insert into public.studio_activity (
    project_id,
    podcast_id,
    user_id,
    action_type,
    description,
    metadata
  )
  values (
    target_project_id,
    target_project.podcast_id,
    auth.uid(),
    'version_saved',
    'Ny studioversion sparades',
    jsonb_build_object('version_number', next_version)
  );

  return created_version;
end;
$$;

create or replace function public.delete_studio_project(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project public.studio_projects;
begin
  select *
  into target_project
  from public.studio_projects
  where studio_projects.id = target_project_id;

  if target_project.id is null then
    return;
  end if;

  if not public.is_podcast_owner(target_project.podcast_id) then
    raise exception 'Endast ägare kan ta bort studioprojekt';
  end if;

  delete from public.studio_projects
  where studio_projects.id = target_project_id;
end;
$$;

drop policy if exists "Members can view studio projects" on public.studio_projects;
create policy "Members can view studio projects"
on public.studio_projects for select to authenticated
using (public.is_podcast_member(podcast_id));

drop policy if exists "Editors can create studio projects" on public.studio_projects;
create policy "Editors can create studio projects"
on public.studio_projects for insert to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.can_edit_podcast(podcast_id)
);

drop policy if exists "Editors can update studio projects" on public.studio_projects;
create policy "Editors can update studio projects"
on public.studio_projects for update to authenticated
using (public.can_edit_podcast(podcast_id))
with check (public.can_edit_podcast(podcast_id));

drop policy if exists "Owners can delete studio projects" on public.studio_projects;
create policy "Owners can delete studio projects"
on public.studio_projects for delete to authenticated
using (public.is_podcast_owner(podcast_id));

drop policy if exists "Members can view studio tracks" on public.studio_tracks;
create policy "Members can view studio tracks"
on public.studio_tracks for select to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_tracks.project_id
      and public.is_podcast_member(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can create studio tracks" on public.studio_tracks;
create policy "Editors can create studio tracks"
on public.studio_tracks for insert to authenticated
with check (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_tracks.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can update studio tracks" on public.studio_tracks;
create policy "Editors can update studio tracks"
on public.studio_tracks for update to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_tracks.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
)
with check (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_tracks.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can delete studio tracks" on public.studio_tracks;
create policy "Editors can delete studio tracks"
on public.studio_tracks for delete to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_tracks.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Members can view studio clips" on public.studio_clips;
create policy "Members can view studio clips"
on public.studio_clips for select to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_clips.project_id
      and public.is_podcast_member(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can create studio clips" on public.studio_clips;
create policy "Editors can create studio clips"
on public.studio_clips for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_clips.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can update studio clips" on public.studio_clips;
create policy "Editors can update studio clips"
on public.studio_clips for update to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_clips.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
)
with check (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_clips.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can delete studio clips" on public.studio_clips;
create policy "Editors can delete studio clips"
on public.studio_clips for delete to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_clips.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Members can view studio files" on public.studio_files;
create policy "Members can view studio files"
on public.studio_files for select to authenticated
using (public.is_podcast_member(podcast_id));

drop policy if exists "Editors can create studio files" on public.studio_files;
create policy "Editors can create studio files"
on public.studio_files for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and public.can_edit_podcast(podcast_id)
);

drop policy if exists "Editors can update own studio files" on public.studio_files;
create policy "Editors can update own studio files"
on public.studio_files for update to authenticated
using (
  uploaded_by = auth.uid()
  and public.can_edit_podcast(podcast_id)
)
with check (
  uploaded_by = auth.uid()
  and public.can_edit_podcast(podcast_id)
);

drop policy if exists "Editors can delete own studio files" on public.studio_files;
create policy "Editors can delete own studio files"
on public.studio_files for delete to authenticated
using (
  uploaded_by = auth.uid()
  and public.can_edit_podcast(podcast_id)
);

drop policy if exists "Members can view studio markers" on public.studio_markers;
create policy "Members can view studio markers"
on public.studio_markers for select to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_markers.project_id
      and public.is_podcast_member(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can manage studio markers" on public.studio_markers;
create policy "Editors can manage studio markers"
on public.studio_markers for all to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_markers.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
)
with check (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_markers.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Members can view studio versions" on public.studio_versions;
create policy "Members can view studio versions"
on public.studio_versions for select to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_versions.project_id
      and public.is_podcast_member(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can create studio versions" on public.studio_versions;
create policy "Editors can create studio versions"
on public.studio_versions for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_versions.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Members can view studio activity" on public.studio_activity;
create policy "Members can view studio activity"
on public.studio_activity for select to authenticated
using (public.is_podcast_member(podcast_id));

drop policy if exists "Editors can create studio activity" on public.studio_activity;
create policy "Editors can create studio activity"
on public.studio_activity for insert to authenticated
with check (
  user_id = auth.uid()
  and public.can_edit_podcast(podcast_id)
);

drop policy if exists "Members can view studio files bucket" on storage.objects;
create policy "Members can view studio files bucket"
on storage.objects for select to authenticated
using (
  bucket_id = 'studio-files'
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and (
        name like podcast_members.podcast_id::text || '/%'
        or name like 'studio-files/' || podcast_members.podcast_id::text || '/%'
      )
  )
);

drop policy if exists "Editors can upload studio files bucket" on storage.objects;
create policy "Editors can upload studio files bucket"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'studio-files'
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and (
        name like podcast_members.podcast_id::text || '/%'
        or name like 'studio-files/' || podcast_members.podcast_id::text || '/%'
      )
  )
);

drop policy if exists "Editors can update own studio files bucket" on storage.objects;
create policy "Editors can update own studio files bucket"
on storage.objects for update to authenticated
using (
  bucket_id = 'studio-files'
  and owner = auth.uid()
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and (
        name like podcast_members.podcast_id::text || '/%'
        or name like 'studio-files/' || podcast_members.podcast_id::text || '/%'
      )
  )
)
with check (
  bucket_id = 'studio-files'
  and owner = auth.uid()
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and (
        name like podcast_members.podcast_id::text || '/%'
        or name like 'studio-files/' || podcast_members.podcast_id::text || '/%'
      )
  )
);

drop policy if exists "Editors can delete own studio files bucket" on storage.objects;
create policy "Editors can delete own studio files bucket"
on storage.objects for delete to authenticated
using (
  bucket_id = 'studio-files'
  and owner = auth.uid()
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and (
        name like podcast_members.podcast_id::text || '/%'
        or name like 'studio-files/' || podcast_members.podcast_id::text || '/%'
      )
  )
);

grant execute on function public.is_podcast_member(uuid) to authenticated;
grant execute on function public.can_edit_podcast(uuid) to authenticated;
grant execute on function public.is_podcast_owner(uuid) to authenticated;
grant execute on function public.create_studio_project(uuid, uuid, text) to authenticated;
grant execute on function public.get_studio_project_for_episode(uuid) to authenticated;
grant execute on function public.save_studio_project_version(uuid, jsonb) to authenticated;
grant execute on function public.delete_studio_project(uuid) to authenticated;
