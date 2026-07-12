create extension if not exists pgcrypto;

alter table public.studio_projects
add column if not exists master_volume numeric not null default 1;

alter table public.studio_projects
add column if not exists master_muted boolean not null default false;

alter table public.studio_projects
add column if not exists output_device_id text;

alter table public.studio_projects
add column if not exists recording_status text not null default 'ready';

alter table public.studio_projects
add column if not exists recording_started_at timestamptz;

alter table public.studio_projects
add column if not exists last_saved_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_projects_recording_status_check'
      and conrelid = 'public.studio_projects'::regclass
  ) then
    alter table public.studio_projects
    add constraint studio_projects_recording_status_check
    check (recording_status in ('ready', 'recording', 'paused', 'stopped')) not valid;
  end if;
end;
$$;

alter table public.studio_tracks
add column if not exists input_gain numeric not null default 1;

alter table public.studio_tracks
add column if not exists input_peak numeric not null default 0;

alter table public.studio_tracks
add column if not exists output_peak numeric not null default 0;

alter table public.studio_tracks
add column if not exists clipping boolean not null default false;

alter table public.studio_tracks
add column if not exists low_signal boolean not null default false;

alter table public.studio_files
add column if not exists storage_bucket text not null default 'studio-files';

alter table public.studio_files
add column if not exists waveform_peaks jsonb not null default '[]'::jsonb;

alter table public.studio_files
add column if not exists recorded_at timestamptz;

alter table public.studio_files
add column if not exists recording_take_number integer;

alter table public.studio_files
add column if not exists upload_status text not null default 'uploaded';

alter table public.studio_files
add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_files_upload_status_check'
      and conrelid = 'public.studio_files'::regclass
  ) then
    alter table public.studio_files
    add constraint studio_files_upload_status_check
    check (upload_status in ('uploaded', 'failed', 'local_only')) not valid;
  end if;
end;
$$;

alter table public.studio_clips
add column if not exists waveform_peaks jsonb not null default '[]'::jsonb;

alter table public.studio_clips
add column if not exists local_recording_id text;

alter table public.studio_clips
add column if not exists upload_status text not null default 'uploaded';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_clips_upload_status_check'
      and conrelid = 'public.studio_clips'::regclass
  ) then
    alter table public.studio_clips
    add constraint studio_clips_upload_status_check
    check (upload_status in ('uploaded', 'failed', 'local_only')) not valid;
  end if;
end;
$$;

create index if not exists studio_files_category_created_at_idx
on public.studio_files(project_id, category, created_at desc);

create index if not exists studio_files_recorded_at_idx
on public.studio_files(project_id, recorded_at desc);

create index if not exists studio_files_upload_status_idx
on public.studio_files(project_id, upload_status);

create index if not exists studio_clips_local_recording_id_idx
on public.studio_clips(local_recording_id);

create index if not exists studio_clips_upload_status_idx
on public.studio_clips(project_id, upload_status);

drop trigger if exists studio_files_touch_updated_at on public.studio_files;

create trigger studio_files_touch_updated_at
before update on public.studio_files
for each row
execute function public.touch_updated_at();

alter table public.studio_files replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.studio_files;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

insert into storage.buckets (id, name, public)
values ('studio-files', 'studio-files', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Members can view studio files bucket"
on storage.objects;

create policy "Members can view studio files bucket"
on storage.objects
for select
to authenticated
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

drop policy if exists "Editors can upload studio files bucket"
on storage.objects;

create policy "Editors can upload studio files bucket"
on storage.objects
for insert
to authenticated
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

drop policy if exists "Editors can update own studio files bucket"
on storage.objects;

create policy "Editors can update own studio files bucket"
on storage.objects
for update
to authenticated
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

drop policy if exists "Editors can delete own studio files bucket"
on storage.objects;

create policy "Editors can delete own studio files bucket"
on storage.objects
for delete
to authenticated
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

grant execute on function public.get_studio_project_for_episode(uuid) to authenticated;
