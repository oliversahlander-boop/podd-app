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

create table if not exists public.dashboard_tasks (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  title text not null,
  status text not null default 'open',
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_tasks
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.dashboard_tasks
add column if not exists episode_id uuid references public.episodes(id) on delete cascade;

alter table public.dashboard_tasks
add column if not exists title text;

alter table public.dashboard_tasks
add column if not exists status text not null default 'open';

alter table public.dashboard_tasks
add column if not exists due_date date;

alter table public.dashboard_tasks
add column if not exists assigned_to uuid references auth.users(id) on delete set null;

alter table public.dashboard_tasks
add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.dashboard_tasks
add column if not exists created_at timestamptz not null default now();

alter table public.dashboard_tasks
add column if not exists updated_at timestamptz not null default now();

alter table public.episodes
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.episodes
add column if not exists status text;

alter table public.episodes
add column if not exists notes text;

alter table public.episodes
add column if not exists script text;

alter table public.episodes
add column if not exists links text;

alter table public.episodes
add column if not exists recording_date date;

alter table public.episodes
add column if not exists publish_date date;

alter table public.episodes
add column if not exists publish_status text not null default 'draft';

alter table public.notifications
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.notifications
add column if not exists actor_id uuid references auth.users(id) on delete set null;

alter table public.notifications
add column if not exists target_url text;

alter table public.production_files
add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

alter table public.production_files
add column if not exists episode_id uuid references public.episodes(id) on delete cascade;

alter table public.production_files
add column if not exists category text;

alter table public.production_files
add column if not exists filename text;

alter table public.production_files
add column if not exists public_url text;

alter table public.production_files
add column if not exists file_path text;

alter table public.production_files
add column if not exists content_type text;

alter table public.production_files
add column if not exists size_bytes bigint not null default 0;

alter table public.production_files
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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dashboard_tasks_status_check'
      and conrelid = 'public.dashboard_tasks'::regclass
  ) then
    alter table public.dashboard_tasks
    add constraint dashboard_tasks_status_check
    check (status in ('open', 'done')) not valid;
  end if;
end;
$$;

create index if not exists episodes_dashboard_podcast_status_idx
on public.episodes(podcast_id, status);

create index if not exists episodes_dashboard_recording_date_idx
on public.episodes(podcast_id, recording_date);

create index if not exists episodes_dashboard_publish_date_idx
on public.episodes(podcast_id, publish_date);

create index if not exists notifications_dashboard_idx
on public.notifications(podcast_id, created_at desc);

create index if not exists production_files_dashboard_idx
on public.production_files(podcast_id, created_at desc);

create index if not exists episode_materials_podcast_id_idx
on public.episode_materials(podcast_id);

create index if not exists episode_materials_episode_id_created_at_idx
on public.episode_materials(episode_id, created_at desc);

create index if not exists episode_materials_podcast_id_created_at_idx
on public.episode_materials(podcast_id, created_at desc);

create index if not exists episode_materials_kind_idx
on public.episode_materials(kind);

create index if not exists dashboard_tasks_podcast_due_date_idx
on public.dashboard_tasks(podcast_id, due_date);

create index if not exists dashboard_tasks_episode_id_idx
on public.dashboard_tasks(episode_id);

create index if not exists dashboard_tasks_assigned_to_idx
on public.dashboard_tasks(assigned_to);

alter table public.episode_materials enable row level security;
alter table public.dashboard_tasks enable row level security;

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

do $$
begin
  alter publication supabase_realtime add table public.episode_materials;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.dashboard_tasks;
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

drop policy if exists "Members can view dashboard tasks"
on public.dashboard_tasks;

create policy "Members can view dashboard tasks"
on public.dashboard_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = dashboard_tasks.podcast_id
      and podcast_members.user_id = auth.uid()
  )
);

drop policy if exists "Editors can create dashboard tasks"
on public.dashboard_tasks;

create policy "Editors can create dashboard tasks"
on public.dashboard_tasks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = dashboard_tasks.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can update dashboard tasks"
on public.dashboard_tasks;

create policy "Editors can update dashboard tasks"
on public.dashboard_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = dashboard_tasks.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = dashboard_tasks.podcast_id
      and podcast_members.user_id = auth.uid()
      and podcast_members.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists "Editors can delete dashboard tasks"
on public.dashboard_tasks;

create policy "Editors can delete dashboard tasks"
on public.dashboard_tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.podcast_members
    where podcast_members.podcast_id = dashboard_tasks.podcast_id
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
