create extension if not exists pgcrypto;

create index if not exists studio_tracks_project_name_idx
on public.studio_tracks(project_id, name);

create index if not exists studio_clips_updated_at_idx
on public.studio_clips(updated_at desc);

create index if not exists studio_markers_updated_at_idx
on public.studio_markers(updated_at desc);

alter table public.studio_projects replica identity full;
alter table public.studio_tracks replica identity full;
alter table public.studio_clips replica identity full;
alter table public.studio_markers replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.studio_projects;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.studio_tracks;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.studio_clips;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.studio_markers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
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

  if not exists (
    select 1
    from public.studio_tracks
    where studio_tracks.project_id = created_project.id
  ) then
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
    );
  end if;

  insert into public.studio_activity (
    project_id,
    podcast_id,
    user_id,
    action_type,
    description
  )
  select
    created_project.id,
    target_podcast_id,
    auth.uid(),
    'project_created',
    'Studioprojekt skapades'
  where not exists (
    select 1
    from public.studio_activity
    where studio_activity.project_id = created_project.id
      and studio_activity.action_type = 'project_created'
  );

  return created_project;
end;
$$;

grant execute on function public.create_studio_project(uuid, uuid, text) to authenticated;
