-- Apply after 001. Automatically clear links in templates and occurrence overrides.
create or replace function public.cleanup_deleted_event_links() returns trigger
language plpgsql security definer set search_path=public as $$
declare row_event record; ex record; updated jsonb; changed boolean;
begin
 -- Auth cascade has already removed the parent; do not update siblings being deleted.
 if not exists(select 1 from auth.users where id=old.user_id) then return old; end if;
 for row_event in select id,payload from public.events where user_id=old.user_id and (
  split_part(payload->>'nextId','@',1)=old.id::text or exists(
   select 1 from jsonb_each(coalesce(payload->'exceptions','{}')) x
   where split_part(x.value#>>'{override,nextId}','@',1)=old.id::text
  )
 ) for update loop
  updated=row_event.payload; changed=false;
  if split_part(updated->>'nextId','@',1)=old.id::text then
   updated=jsonb_set(updated,'{nextId}','null'); changed=true;
  end if;
  for ex in select key,value from jsonb_each(coalesce(updated->'exceptions','{}')) loop
   if split_part(ex.value#>>'{override,nextId}','@',1)=old.id::text then
    updated=jsonb_set(updated,array['exceptions',ex.key,'override','nextId'],'null'); changed=true;
   end if;
  end loop;
  if changed then update public.events set payload=updated,revision=revision+1,updated_at=now() where id=row_event.id; end if;
 end loop;
 return old;
end $$;
revoke all on function public.cleanup_deleted_event_links() from public,anon,authenticated;
create trigger event_link_cleanup after delete on public.events
for each row execute function public.cleanup_deleted_event_links();
