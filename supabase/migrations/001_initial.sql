-- Run once in a new Supabase project's SQL editor.
create table public.events (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null, revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (jsonb_typeof(payload)='object'), check (payload->>'id'=id::text), check (revision>0)
);
create index events_user_idx on public.events(user_id);
alter table public.events enable row level security;
revoke all on public.events from anon,authenticated;
grant select,insert,update,delete on public.events to authenticated;
create policy events_owner on public.events for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create function public.save_event(p_id uuid,p_payload jsonb,p_expected integer) returns integer language plpgsql security invoker set search_path=public as $$
declare v integer;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 if p_expected=0 then
  insert into events(id,user_id,payload,revision) values(p_id,auth.uid(),p_payload,1) on conflict do nothing returning revision into v;
 else
  update events set payload=p_payload,revision=revision+1,updated_at=now() where id=p_id and user_id=auth.uid() and revision=p_expected returning revision into v;
 end if;
 if v is null then raise exception 'CONFLICT'; end if; return v;
end $$;
create function public.delete_event(p_id uuid,p_expected integer) returns void language plpgsql security invoker set search_path=public as $$
begin
 delete from events where id=p_id and user_id=auth.uid() and revision=p_expected;
 if not found then raise exception 'CONFLICT'; end if;
 update events set payload=jsonb_set(payload,'{nextId}','null'),revision=revision+1,updated_at=now() where user_id=auth.uid() and split_part(payload->>'nextId','@',1)=p_id::text;
end $$;
revoke all on function public.save_event(uuid,jsonb,integer) from public,anon;
revoke all on function public.delete_event(uuid,integer) from public,anon;
grant execute on function public.save_event(uuid,jsonb,integer) to authenticated;
grant execute on function public.delete_event(uuid,integer) to authenticated;
-- Refresh/access tokens are encrypted and accessible only to server service_role.
create table public.google_connections(user_id uuid primary key references auth.users(id) on delete cascade, encrypted_tokens text not null, updated_at timestamptz not null default now());
alter table public.google_connections enable row level security;
revoke all on public.google_connections from anon,authenticated;
grant all on public.google_connections to service_role;
-- One transaction: a failed import/restore leaves previous data intact.
create function public.import_google_events(p_events jsonb,p_deleted uuid[]) returns void language plpgsql security invoker set search_path=public as $$
declare e jsonb; id_value uuid; expected integer; latest integer;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 for e in select value from jsonb_array_elements(p_events) loop
  id_value=(e->>'id')::uuid; expected=(e->>'revision')::integer;
  select revision into latest from events where id=id_value and user_id=auth.uid() for update;
  if latest is not null and latest<>expected then raise exception 'CONFLICT'; end if;
  if latest is null and expected<>0 then raise exception 'CONFLICT'; end if;
  perform save_event(id_value,e,expected);
 end loop;
 delete from events where user_id=auth.uid() and id=any(p_deleted) and payload->>'source'='google';
 update events set payload=jsonb_set(payload,'{nextId}','null'),revision=revision+1 where user_id=auth.uid() and exists(select 1 from unnest(p_deleted) d where payload->>'nextId'=d::text);
end $$;
create function public.restore_events(p_events jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare e jsonb;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 delete from events where user_id=auth.uid();
 for e in select value from jsonb_array_elements(p_events) loop
  insert into events(id,user_id,payload,revision) values((e->>'id')::uuid,auth.uid(),e,greatest((e->>'revision')::integer,1));
 end loop;
end $$;
revoke all on function public.import_google_events(jsonb,uuid[]) from public,anon;
revoke all on function public.restore_events(jsonb) from public,anon;
grant execute on function public.import_google_events(jsonb,uuid[]) to authenticated;
grant execute on function public.restore_events(jsonb) to authenticated;
