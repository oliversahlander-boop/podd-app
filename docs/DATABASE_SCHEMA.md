# Databasschema

Dokumentet beskriver migrationerna `002`–`009` och fält som applikationen använder.

## Kärntabeller

- `podcasts`: `id`, `name`, `description`, `thumbnail_url`, `created_by`, timestamps. Förälder till medlemskap, avsnitt och filer.
- `profiles`: `id` → `auth.users`, `email`, `display_name`, `avatar_url`, `theme`, timestamps.
- `podcast_members`: `podcast_id`, `user_id`, `email`, `role`, timestamps; unik medlem per podd.
- `episodes`: `id`, `podcast_id`, titel/beskrivning/status, manus, segment JSON, anteckningar, länkar, checklistor, ansvarig, datum, publiceringsfält, artwork, längd och timestamps.
- `notifications`: podd, actor, typ, titel, body, target och timestamp.
- `notification_reads`: notification/user och lästid.
- `production_files`: podd/avsnitt, kategori, filnamn/path/public URL, MIME, storlek, uploader och timestamp.
- `episode_materials`: podd/avsnitt, kategori, typ, namn, Storage-data/extern URL, metadata, uploader och timestamps.
- `dashboard_tasks`: podd/avsnitt, titel, status, ansvarig, deadline och timestamps.

## Studio

- `studio_projects`: podd/avsnitt, namn, version/project_version, duration, sample rate, channel, zoom, playhead, selection, master/output/recording state, `updated_by`, `client_mutation_id`, timestamps.
- `studio_tracks`: projekt, namn, typ, ansvarig, I/O, channel, gain/volume/pan, mute/solo/armed/monitoring, order/height/meters, mutationsfält och timestamps.
- `studio_files`: projekt/podd/avsnitt, kategori, bucket/path/name, MIME, storlek, duration/sample/channel, status, peaks, uploader, mutationsfält och timestamps.
- `studio_clips`: projekt/track/source file, namn, start/source offset/duration, gain/fades, mute/lock/order, local recording/status/peaks, creator, mutationsfält och timestamps.
- `studio_markers`: projekt, titel, position, creator, mutationsfält och timestamps.
- `studio_versions`: projekt, nummer, JSON-säker snapshot, creator/mutationsfält och timestamps.
- `studio_activity`: projekt/podd/user, action, description, metadata, mutationsfält och timestamps.
- `studio_edit_commands`: stabilt command-ID, projekt/user/type, JSON-säker before/after, client mutation, project version och timestamps.

Relationer använder cascade för ägda projektdata och `source_file_id … on delete set null` för icke-destruktiv cliphantering.

## Storage

- `episodes-material`: profil-, podd- och avsnittsmaterial enligt sökvägsbaserade medlems-/rollpolicyer.
- `studio-files` (privat): `{podcast_id}/{episode_id}/{recordings|imported|music|sound-effects|exports}/…`; medlemmar läser, owner/admin/editor skriver/raderar.

## RPC

`current_podcast_role`, `add_podcast_member_by_email`, `get_podcast_members`, `delete_podcast`, `create_studio_project`, `get_studio_project_for_episode`, `save_studio_project_if_version`, `save_studio_project_version`, `record_studio_edit_command`, `delete_studio_project` samt medlems-/editor-/ägarhjälpfunktioner.

## Triggers, RLS och Realtime

`touch_updated_at` och Studio-mutationstriggers uppdaterar timestamps/actor/version. RLS går via `auth.uid() → podcast_members → podcast_id`: medlem läser, owner/admin/editor skriver, endast owner raderar hel podd/projekt. Realtime omfattar notifications, episodes, production files, episode materials, dashboard tasks och Studio-projekt/tracks/clips/files/markers/versions/activity/commands enligt migrationerna.
