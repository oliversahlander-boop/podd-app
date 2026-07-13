<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code and heed deprecations.
<!-- END:nextjs-agent-rules -->

# Project

Collaborative Swedish podcast planning, recording, editing and publishing application. The product is modern, compact, professional, easy to navigate and Spotify-inspired—not a generic AI dashboard. All visible UI text must be Swedish. Studio is a separate full-screen audio editor inspired by Audacity and DaVinci Resolve Fairlight.

# Technology

Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Database, Storage and Realtime.

# Required reading

Review this index, then read the task-relevant documents before editing:

- `docs/PROJECT_CONTEXT.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/FEATURES.md`
- `docs/TESTING.md`

# Database workflow

Before application changes, determine whether the request needs a table, column, index, foreign key, function, trigger, constraint, enum, Storage bucket, RLS policy or Realtime publication change. If yes, create ONE complete idempotent SQL migration (`IF NOT EXISTS`, `CREATE OR REPLACE`, and `DROP POLICY IF EXISTS` where applicable), do not edit React, and wait for confirmation that SQL ran. Never assume a referenced field exists.

# Preservation rules

- Never remove functionality unless explicitly requested or replace real behavior with placeholders, mock data, fake statistics, fake buttons or fake waveforms.
- Preserve routes, handlers, uploads, Realtime, role checks and Supabase names.
- Reuse `src/components/ui` before creating components; never create duplicate systems.
- Owner alone may delete a podcast. Owner/admin/editor may edit shared content. Viewer may only view, play and download.

# UI rules

Read `docs/DESIGN_SYSTEM.md`, use shared UI components, semantic tokens and the spacing scale. Do not introduce arbitrary page-specific card/button/input systems. Keep Swedish labels, compact layouts and Studio’s separate editor shell. Avoid excessive cards, empty space and oversized headings. Do not mix user and podcast settings.

# Persistence and collaboration

Supabase Database is metadata source of truth; Storage is uploaded-file source of truth. IndexedDB is only for recovery, offline queues and unfinished recordings. Never show `Sparat` before cloud confirmation; use `Ej sparat`, `Sparar…`, `Sparat`, `Sparat lokalt`, `Synkfel`, `Offline`. Ignore own Realtime echoes with `updated_by`/`client_mutation_id`; do not notify for zoom, meters, playhead or autosave.

# Prevent design drift

For new UI: read the design system, search `src/components/ui`, use semantic tokens, avoid arbitrary colors/spacing/radii and page-specific primitives, keep Swedish text, preserve responsiveness and Studio separation.

# Verification

Run `npm run lint`, `npx tsc --noEmit`, `npm run build`, and relevant existing tests. Never claim completion when required checks fail.
