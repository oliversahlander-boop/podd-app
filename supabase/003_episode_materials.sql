create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('episodes-material', 'episodes-material', true)
on conflict (id) do update
set public = excluded.public;

create table if not exists public.episode_materials (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  kind text not null,
  name text not null,
  url text not null,
  file_path text,
  content_type text,
  size_bytes bigint not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.episode_materials
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.episode_materials
add column if not exists episode_id uuid references public.episodes(id) on delete cascade;

alter table public.episode_materials
add column if not exists kind text;

alter table public.episode_materials
add column if not exists name text;

alter table public.episode_materials
add column if not exists url text;

alter table public.episode_materials
add column if not exists file_path text;

alter table public.episode_materials
add column if not exists content_type text;

alter table public.episode_materials
add column if not exists size_bytes bigint not null default 0;

alter table public.episode_materials
add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.episode_materials
add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'episode_materials_kind_check'
      and conrelid = 'public.episode_materials'::regclass
  ) then
    alter table public.episode_materials
    add constraint episode_materials_kind_check
    check (kind in ('image', 'video', 'file', 'link')) not valid;
  end if;
end;
$$;

create index if not exists episode_materials_podcast_id_idx
on public.episode_materials(podcast_id);

create index if not exists episode_materials_episode_id_created_at_idx
on public.episode_materials(episode_id, created_at desc);

create index if not exists episode_materials_kind_idx
on public.episode_materials(kind);

alter table public.episode_materials enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.episode_materials;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

drop policy if exists "Members can view episode materials"
on public.episode_materials;

create policy "Members can view episode materials"
on public.episode_materials
for select
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episode_materials.podcast_id
      and podcast_members.user_id = auth.uid()
  )
);

drop policy if exists "Editors can create episode materials"
on public.episode_materials;

create policy "Editors can create episode materials"
on public.episode_materials
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episode_materials.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can update episode materials"
on public.episode_materials;

create policy "Editors can update episode materials"
on public.episode_materials
for update
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episode_materials.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episode_materials.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can delete episode materials"
on public.episode_materials;

create policy "Editors can delete episode materials"
on public.episode_materials
for delete
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = episode_materials.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

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

  delete from public.episode_materials
  where episode_materials.podcast_id = target_podcast_id;

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

grant execute on function public.delete_podcast(uuid) to authenticated;
