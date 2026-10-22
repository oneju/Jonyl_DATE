-- Apply after 003. Keep previously imported events and their preparation plans.
-- Remove the unused import RPC and stored Calendar OAuth tokens.
begin;
drop function if exists public.import_google_events(jsonb,uuid[]);
drop table if exists public.google_connections;
commit;
