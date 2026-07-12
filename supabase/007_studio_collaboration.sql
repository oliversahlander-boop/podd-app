-- Komplett, idempotent samarbetsgrund för Studio.

alter table public.studio_versions replica identity full;
alter table public.studio_activity replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.studio_versions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.studio_activity;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

drop policy if exists "Editors can update own studio files" on public.studio_files;
drop policy if exists "Editors can update studio files" on public.studio_files;
create policy "Editors can update studio files"
on public.studio_files
for update
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = studio_files.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = studio_files.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can delete own studio files" on public.studio_files;
drop policy if exists "Editors can delete studio files" on public.studio_files;
create policy "Editors can delete studio files"
on public.studio_files
for delete
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = studio_files.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can update own studio files bucket" on storage.objects;
drop policy if exists "Editors can update studio files bucket" on storage.objects;
create policy "Editors can update studio files bucket"
on storage.objects
for update
to authenticated
using (
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
)
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

drop policy if exists "Editors can delete own studio files bucket" on storage.objects;
drop policy if exists "Editors can delete studio files bucket" on storage.objects;
create policy "Editors can delete studio files bucket"
on storage.objects
for delete
to authenticated
using (
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
    version = version + 1,
    updated_by = auth.uid(),
    updated_at = now()
  where id = target_project_id
  returning * into saved_project;

  return saved_project;
end;
$$;

revoke all on function public.save_studio_project_if_version(uuid, integer, jsonb) from public;
grant execute on function public.save_studio_project_if_version(uuid, integer, jsonb) to authenticated;

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
  perform pg_advisory_xact_lock(hashtext(target_project_id::text));

  select * into target_project
  from public.studio_projects
  where id = target_project_id
  for update;

  if target_project.id is null then
    raise exception 'studio_project_not_found';
  end if;

  if not exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = target_project.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  ) then
    raise exception 'studio_project_forbidden';
  end if;

  select coalesce(max(version_number), 0) + 1
  into next_version
  from public.studio_versions
  where project_id = target_project_id;

  insert into public.studio_versions (
    project_id,
    version_number,
    snapshot,
    created_by
  ) values (
    target_project_id,
    next_version,
    project_snapshot,
    auth.uid()
  ) returning * into created_version;

  update public.studio_projects
  set
    version = greatest(version, next_version),
    last_saved_at = now(),
    updated_by = auth.uid(),
    updated_at = now()
  where id = target_project_id;

  insert into public.studio_activity (
    project_id,
    podcast_id,
    user_id,
    action_type,
    description,
    metadata
  ) values (
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

revoke all on function public.save_studio_project_version(uuid, jsonb) from public;
grant execute on function public.save_studio_project_version(uuid, jsonb) to authenticated;
