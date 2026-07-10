---
name: migration
description: Create a Supabase database migration for this project with RLS, following house conventions. Use whenever a schema, policy, storage bucket, or database function change is needed.
---

Create the requested database change as a migration. Rules:

1. New file in `supabase/migrations/`, numbered sequentially (NNNN_name.sql),
   never edit an already-shared migration.
2. Every new table gets RLS enabled with explicit policies in the same
   migration. Default posture: users read/write their own rows; content
   tables (programs, plans, media metadata) are public-read,
   admin/content-team write.
3. Nothing hardcodes one product — program-scoped, not Bajrangvati-scoped.
4. Timestamps timestamptz; day-boundary logic uses Asia/Kolkata.
5. If an enum value is added AND used in the same change, split into two
   migrations (enum value must commit before use — learned on the portal).
6. Mirror any new columns/types in the TypeScript types.
7. **End the session response with, verbatim and prominent:**
   "⚠️ USER MUST RUN migration NNNN in the Supabase SQL editor before this
   feature works." List any manual dashboard steps (buckets, auth settings)
   separately.
