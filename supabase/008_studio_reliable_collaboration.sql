-- Idempotent grund för tillförlitlig Studio-synkning, mutationsidentifiering
-- och JSON-säkra redigeringskommandon.

create extension if not exists pgcrypto;

alter table public.studio_projects add column if not exists client_mutation_id uuid;
alter table public.studio_projects add column if not exists project_version integer not null default 1;

alter table public.studio_tracks add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.studio_tracks add column if not exists client_mutation_id uuid;
alter table public.studio_tracks add column if not exists project_version integer not null default 1;

alter table public.studio_clips add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.studio_clips add column if not exists client_mutation_id uuid;
alter table public.studio_clips add column if not exists project_version integer not null default 1;

alter table public.studio_files add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.studio_files add column if not exists updated_at timestamptz not null default now();
alter table public.studio_files add column if not exists client_mutation_id uuid;
alter table public.studio_files add column if not exists project_version integer not null default 1;

alter table public.studio_markers add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.studio_markers add column if not exists client_mutation_id uuid;
alter table public.studio_markers add column if not exists project_version integer not null default 1;

alter table public.studio_versions add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.studio_versions add column if not exists updated_at timestamptz not null default now();
alter table public.studio_versions add column if not exists client_mutation_id uuid;
alter table public.studio_versions add column if not exists project_version integer not null default 1;

alter table public.studio_activity add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.studio_activity add column if not exists updated_at timestamptz not null default now();
alter table public.studio_activity add column if not exists client_mutation_id uuid;
alter table public.studio_activity add column if not exists project_version integer not null default 1;

create table if not exists public.studio_edit_commands (
  id uuid primary key,
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  command_type text not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  client_mutation_id uuid not null,
  project_version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, client_mutation_id)
);

alter table public.studio_edit_commands add column if not exists project_id uuid references public.studio_projects(id) on delete cascade;
alter table public.studio_edit_commands add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.studio_edit_commands add column if not exists command_type text;
alter table public.studio_edit_commands add column if not exists before_state jsonb not null default '{}'::jsonb;
alter table public.studio_edit_commands add column if not exists after_state jsonb not null default '{}'::jsonb;
alter table public.studio_edit_commands add column if not exists client_mutation_id uuid;
alter table public.studio_edit_commands add column if not exists project_version integer not null default 1;
alter table public.studio_edit_commands add column if not exists created_at timestamptz not null default now();
alter table public.studio_edit_commands add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'studio_edit_commands_project_mutation_unique'
      and conrelid = 'public.studio_edit_commands'::regclass
  ) then
    alter table public.studio_edit_commands
      add constraint studio_edit_commands_project_mutation_unique
      unique (project_id, client_mutation_id);
  end if;
end;
$$;

create index if not exists studio_tracks_project_mutation_idx
  on public.studio_tracks(project_id, client_mutation_id);
create index if not exists studio_clips_project_mutation_idx
  on public.studio_clips(project_id, client_mutation_id);
create index if not exists studio_files_project_mutation_idx
  on public.studio_files(project_id, client_mutation_id);
create index if not exists studio_markers_project_mutation_idx
  on public.studio_markers(project_id, client_mutation_id);
create index if not exists studio_edit_commands_project_created_idx
  on public.studio_edit_commands(project_id, created_at desc);
create index if not exists studio_edit_commands_retry_identity_idx
  on public.studio_edit_commands(project_id, client_mutation_id);

update public.studio_projects
set project_version = greatest(project_version, version);

update public.studio_tracks as child
set project_version = parent.version
from public.studio_projects as parent
where parent.id = child.project_id;

update public.studio_clips as child
set project_version = parent.version
from public.studio_projects as parent
where parent.id = child.project_id;

update public.studio_files as child
set project_version = parent.version
from public.studio_projects as parent
where parent.id = child.project_id;

update public.studio_markers as child
set project_version = parent.version
from public.studio_projects as parent
where parent.id = child.project_id;

update public.studio_versions
set project_version = greatest(project_version, version_number);

update public.studio_activity as child
set project_version = parent.version
from public.studio_projects as parent
where parent.id = child.project_id;

create or replace function public.studio_apply_mutation_metadata()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  authenticated_user uuid := auth.uid();
  current_version integer;
begin
  if tg_table_name = 'studio_projects' then
    new.updated_at := now();
    new.updated_by := coalesce(authenticated_user, new.updated_by);
    new.project_version := greatest(coalesce(new.project_version, 1), coalesce(new.version, 1));
    return new;
  end if;

  select version into current_version
  from public.studio_projects
  where id = new.project_id;

  new.updated_at := now();
  new.updated_by := coalesce(authenticated_user, new.updated_by);
  new.project_version := coalesce(nullif(new.project_version, 0), current_version, 1);
  return new;
end;
$$;

drop trigger if exists studio_projects_mutation_metadata on public.studio_projects;
create trigger studio_projects_mutation_metadata
before insert or update on public.studio_projects
for each row execute function public.studio_apply_mutation_metadata();

drop trigger if exists studio_tracks_mutation_metadata on public.studio_tracks;
create trigger studio_tracks_mutation_metadata
before insert or update on public.studio_tracks
for each row execute function public.studio_apply_mutation_metadata();

drop trigger if exists studio_clips_mutation_metadata on public.studio_clips;
create trigger studio_clips_mutation_metadata
before insert or update on public.studio_clips
for each row execute function public.studio_apply_mutation_metadata();

drop trigger if exists studio_files_mutation_metadata on public.studio_files;
create trigger studio_files_mutation_metadata
before insert or update on public.studio_files
for each row execute function public.studio_apply_mutation_metadata();

drop trigger if exists studio_markers_mutation_metadata on public.studio_markers;
create trigger studio_markers_mutation_metadata
before insert or update on public.studio_markers
for each row execute function public.studio_apply_mutation_metadata();

drop trigger if exists studio_versions_mutation_metadata on public.studio_versions;
create trigger studio_versions_mutation_metadata
before insert or update on public.studio_versions
for each row execute function public.studio_apply_mutation_metadata();

drop trigger if exists studio_activity_mutation_metadata on public.studio_activity;
create trigger studio_activity_mutation_metadata
before insert or update on public.studio_activity
for each row execute function public.studio_apply_mutation_metadata();

drop trigger if exists studio_edit_commands_touch_updated_at on public.studio_edit_commands;
create trigger studio_edit_commands_touch_updated_at
before update on public.studio_edit_commands
for each row execute function public.touch_updated_at();

create or replace function public.record_studio_edit_command(
  target_command_id uuid,
  target_project_id uuid,
  target_command_type text,
  target_before_state jsonb,
  target_after_state jsonb,
  target_client_mutation_id uuid,
  target_project_version integer
)
returns public.studio_edit_commands
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project public.studio_projects;
  saved_command public.studio_edit_commands;
begin
  select * into target_project
  from public.studio_projects
  where id = target_project_id;

  if target_project.id is null then
    raise exception 'studio_project_not_found';
  end if;

  if not public.can_edit_podcast(target_project.podcast_id) then
    raise exception 'studio_project_forbidden';
  end if;

  insert into public.studio_edit_commands (
    id,
    project_id,
    user_id,
    command_type,
    before_state,
    after_state,
    client_mutation_id,
    project_version
  ) values (
    target_command_id,
    target_project_id,
    auth.uid(),
    target_command_type,
    coalesce(target_before_state, '{}'::jsonb),
    coalesce(target_after_state, '{}'::jsonb),
    target_client_mutation_id,
    target_project_version
  )
  on conflict (project_id, client_mutation_id) do update
  set updated_at = public.studio_edit_commands.updated_at
  returning * into saved_command;

  return saved_command;
end;
$$;

revoke all on function public.record_studio_edit_command(uuid, uuid, text, jsonb, jsonb, uuid, integer) from public;
grant execute on function public.record_studio_edit_command(uuid, uuid, text, jsonb, jsonb, uuid, integer) to authenticated;

alter table public.studio_edit_commands enable row level security;

drop policy if exists "Members can view studio edit commands" on public.studio_edit_commands;
create policy "Members can view studio edit commands"
on public.studio_edit_commands for select to authenticated
using (
  exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_edit_commands.project_id
      and public.is_podcast_member(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can create studio edit commands" on public.studio_edit_commands;
create policy "Editors can create studio edit commands"
on public.studio_edit_commands for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_edit_commands.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

drop policy if exists "Editors can retry own studio edit commands" on public.studio_edit_commands;
create policy "Editors can retry own studio edit commands"
on public.studio_edit_commands for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_edit_commands.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.studio_projects
    where studio_projects.id = studio_edit_commands.project_id
      and public.can_edit_podcast(studio_projects.podcast_id)
  )
);

insert into storage.buckets (id, name, public)
values ('studio-files', 'studio-files', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Members can view studio files bucket" on storage.objects;
create policy "Members can view studio files bucket"
on storage.objects for select to authenticated
using (
  bucket_id = 'studio-files'
  and exists (
    select 1 from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and name like podcast_members.podcast_id::text || '/%'
  )
);

drop policy if exists "Editors can upload studio files bucket" on storage.objects;
create policy "Editors can upload studio files bucket"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'studio-files'
  and exists (
    select 1 from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and name like podcast_members.podcast_id::text || '/%'
  )
);

drop policy if exists "Editors can update own studio files bucket" on storage.objects;
drop policy if exists "Editors can update studio files bucket" on storage.objects;
create policy "Editors can update studio files bucket"
on storage.objects for update to authenticated
using (
  bucket_id = 'studio-files'
  and exists (
    select 1 from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and name like podcast_members.podcast_id::text || '/%'
  )
)
with check (
  bucket_id = 'studio-files'
  and exists (
    select 1 from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and name like podcast_members.podcast_id::text || '/%'
  )
);

drop policy if exists "Editors can delete own studio files bucket" on storage.objects;
drop policy if exists "Editors can delete studio files bucket" on storage.objects;
create policy "Editors can delete studio files bucket"
on storage.objects for delete to authenticated
using (
  bucket_id = 'studio-files'
  and exists (
    select 1 from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and name like podcast_members.podcast_id::text || '/%'
  )
);

alter table public.studio_projects replica identity full;
alter table public.studio_tracks replica identity full;
alter table public.studio_clips replica identity full;
alter table public.studio_files replica identity full;
alter table public.studio_markers replica identity full;
alter table public.studio_versions replica identity full;
alter table public.studio_activity replica identity full;
alter table public.studio_edit_commands replica identity full;

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'studio_projects',
    'studio_tracks',
    'studio_clips',
    'studio_files',
    'studio_markers',
    'studio_versions',
    'studio_activity',
    'studio_edit_commands'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = relation_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', relation_name);
    end if;
  end loop;
exception
  when undefined_object then null;
end;
$$;
