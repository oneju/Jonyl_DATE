-- Apply after 002. Auth user deletion runs as supabase_auth_admin, which cannot
-- read public.events through an INVOKER trigger in some Auth execution contexts.
-- Candidate fix for the observed remote deletion error; re-test after applying.
-- The trigger scopes all updates to OLD.user_id and uses a fixed search_path.
alter function public.cleanup_deleted_event_links() security definer;
alter function public.cleanup_deleted_event_links() set search_path=public;
revoke all on function public.cleanup_deleted_event_links() from public,anon,authenticated;
