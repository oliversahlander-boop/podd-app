-- Privat Studio-lagring och full mutationsidentitet för projektuppdateringar.

insert into storage.buckets (id, name, public)
values ('studio-files', 'studio-files', false)
on conflict (id) do update set public = false;

drop policy if exists "Members can view studio files bucket" on storage.objects;
create policy "Members can view studio files bucket"
on storage.objects for select to authenticated
using (
  bucket_id = 'studio-files'
  and exists (
    select 1
    from public.podcast_members
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
    select 1
    from public.podcast_members
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
    select 1
    from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and name like podcast_members.podcast_id::text || '/%'
  )
)
with check (
  bucket_id = 'studio-files'
  and exists (
    select 1
    from public.podcast_members
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
    select 1
    from public.podcast_members
    where podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
      and name like podcast_members.podcast_id::text || '/%'
  )
);

create or replace function public.save_studio_project_if_version(
  target_project_id uuid,
  expected_version integer,
  project_patch jsonb
)
returns public.studio_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  current_project public.studio_projects;
  saved_project public.studio_projects;
  next_version integer;
begin
  select *
  into current_project
  from public.studio_projects
  where id = target_project_id
  for update;

  if current_project.id is null then
    raise exception 'studio_project_not_found';
  end if;

  if not exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = current_project.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  ) then
    raise exception 'studio_project_forbidden';
  end if;

  if current_project.version <> expected_version then
    raise exception 'studio_project_version_conflict'
      using detail = jsonb_build_object(
        'expected_version', expected_version,
        'server_version', current_project.version,
        'updated_at', current_project.updated_at
      )::text;
  end if;

  next_version := current_project.version + 1;

  update public.studio_projects
  set
    name = coalesce(project_patch->>'name', name),
    duration_seconds = coalesce((project_patch->>'duration_seconds')::numeric, duration_seconds),
    zoom = coalesce((project_patch->>'zoom')::numeric, zoom),
    playhead_seconds = coalesce((project_patch->>'playhead_seconds')::numeric, playhead_seconds),
    selection_start = case
      when project_patch ? 'selection_start' then (project_patch->>'selection_start')::numeric
      else selection_start
    end,
    selection_end = case
      when project_patch ? 'selection_end' then (project_patch->>'selection_end')::numeric
      else selection_end
    end,
    master_volume = coalesce((project_patch->>'master_volume')::numeric, master_volume),
    master_muted = coalesce((project_patch->>'master_muted')::boolean, master_muted),
    output_device_id = case
      when project_patch ? 'output_device_id' then project_patch->>'output_device_id'
      else output_device_id
    end,
    recording_status = coalesce(project_patch->>'recording_status', recording_status),
    version = next_version,
    project_version = coalesce(
      nullif((project_patch->>'project_version')::integer, 0),
      next_version
    ),
    client_mutation_id = case
      when project_patch ? 'client_mutation_id'
        then nullif(project_patch->>'client_mutation_id', '')::uuid
      else client_mutation_id
    end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = target_project_id
  returning * into saved_project;

  return saved_project;
end;
$$;

revoke all on function public.save_studio_project_if_version(uuid, integer, jsonb) from public;
grant execute on function public.save_studio_project_if_version(uuid, integer, jsonb) to authenticated;

alter table public.studio_projects replica identity full;
alter table public.studio_tracks replica identity full;
alter table public.studio_clips replica identity full;
alter table public.studio_files replica identity full;
alter table public.studio_markers replica identity full;
alter table public.studio_activity replica identity full;

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
    'studio_activity'
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
