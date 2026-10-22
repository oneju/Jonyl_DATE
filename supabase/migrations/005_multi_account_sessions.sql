-- New server-only registry. Does not change events, their owners, or existing RLS.
begin;
create table if not exists public.browser_account_sessions (
 browser_hash text not null check(length(browser_hash)=64),
 user_id uuid not null references auth.users(id) on delete cascade,
 email text not null,
 encrypted_session text not null,
 expires_at timestamptz not null default now()+interval '30 days',
 needs_login boolean not null default false,
 refresh_lock_until timestamptz not null default 'epoch',
 refresh_nonce uuid,
 primary key(browser_hash,user_id)
);
alter table public.browser_account_sessions enable row level security;
revoke all on public.browser_account_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.browser_account_sessions to service_role;
create index if not exists browser_account_expiry_idx on public.browser_account_sessions(expires_at);
commit;
