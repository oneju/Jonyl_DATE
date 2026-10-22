import {cookies} from 'next/headers';
import {createClient,type Session} from '@supabase/supabase-js';
import {randomBytes,randomUUID} from 'node:crypto';
import {admin,client} from './supabase-server';
import {browserHash,sealSession,openSession} from './session-crypto';
const COOKIE='jongil-browser',ACTIVE='jongil-active-account',TABLE='browser_account_sessions';
type Tokens=Pick<Session,'access_token'|'refresh_token'|'expires_at'>;
type Row={browser_hash:string;user_id:string;email:string;encrypted_session:string;expires_at:string;needs_login:boolean;refresh_nonce:string|null;refresh_lock_until:string};
export type Account={id:string;email:string;expired:boolean};
const noStore={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
function publicClient(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,noStore)}
function binding(hash:string,id:string){return `${process.env.NEXT_PUBLIC_SUPABASE_URL}:${hash}:${id}`}
function checked(error:unknown){if(error)throw Error('MULTI_ACCOUNT_SETUP_REQUIRED')}
async function identity(create=false){const jar=await cookies();let token=jar.get(COOKIE)?.value;if(!token||!/^[-\w]{43}$/.test(token)){if(!create)return null;token=randomBytes(32).toString('base64url');jar.set(COOKIE,token,{httpOnly:true,secure:Boolean(process.env.VERCEL)||process.env.APP_URL?.startsWith('https:'),sameSite:'lax',path:'/',maxAge:2592000})}return browserHash(token)}
export async function storeReady(){const {error}=await admin().from(TABLE).select('user_id').limit(0);checked(error)}
async function row(hash:string,id:string){const {data,error}=await admin().from(TABLE).select('*').eq('browser_hash',hash).eq('user_id',id).gt('expires_at',new Date().toISOString()).maybeSingle();checked(error);if(!data)throw Error('UNAUTHORIZED');return data as Row}
export async function addSession(session:Session){
 const db=publicClient();const {data,error}=await db.auth.getUser(session.access_token);if(error||!data.user||data.user.id!==session.user.id)throw Error('UNAUTHORIZED');
 const hash=(await identity(true))!;const {access_token,refresh_token,expires_at}=session;
 const {error:saved}=await admin().from(TABLE).upsert({browser_hash:hash,user_id:data.user.id,email:data.user.email??'회원',encrypted_session:sealSession({access_token,refresh_token,expires_at},binding(hash,data.user.id),process.env.SUPABASE_SERVICE_ROLE_KEY!),needs_login:false,expires_at:new Date(Date.now()+2592000000).toISOString(),refresh_lock_until:new Date(0).toISOString(),refresh_nonce:null},{onConflict:'browser_hash,user_id'});checked(saved);
 (await cookies()).set(ACTIVE,data.user.id,{httpOnly:true,secure:Boolean(process.env.VERCEL)||process.env.APP_URL?.startsWith('https:'),sameSite:'lax',path:'/',maxAge:2592000});
 return {id:data.user.id,email:data.user.email??'회원',expired:false};
}
export async function accountList(){
 const hash=await identity();if(!hash)return {accounts:[] as Account[],activeId:null};
 const {data,error}=await admin().from(TABLE).select('user_id,email,needs_login').eq('browser_hash',hash).gt('expires_at',new Date().toISOString()).order('user_id');checked(error);
 const accounts=(data??[]).map(r=>({id:r.user_id,email:r.email,expired:r.needs_login}));const active=(await cookies()).get(ACTIVE)?.value;
 return {accounts,activeId:accounts.some(a=>a.id===active)?active:accounts.find(a=>!a.expired)?.id??accounts[0]?.id??null};
}
export async function markExpired(id:string){const hash=await identity();if(hash)await admin().from(TABLE).update({needs_login:true}).eq('browser_hash',hash).eq('user_id',id)}
export async function accountClient(id:string){
 if(!/^[\da-f-]{36}$/i.test(id))throw Error('UNAUTHORIZED');const hash=await identity();
 if(!hash){const legacy=await client();const {data,error}=await legacy.auth.getUser();if(error||data.user?.id!==id)throw Error('UNAUTHORIZED');return {db:legacy,user:data.user}}
 let record=await row(hash,id);if(record.needs_login)throw Error('ACCOUNT_EXPIRED');
 let tokens:Tokens;try{tokens=openSession(record.encrypted_session,binding(hash,id),process.env.SUPABASE_SERVICE_ROLE_KEY!)}catch{await markExpired(id);throw Error('ACCOUNT_EXPIRED')}
 if(!tokens.expires_at||tokens.expires_at*1000<Date.now()+60000){
  const nonce=randomUUID();const {data:lock,error}=await admin().from(TABLE).update({refresh_nonce:nonce,refresh_lock_until:new Date(Date.now()+15000).toISOString()}).eq('browser_hash',hash).eq('user_id',id).lt('refresh_lock_until',new Date().toISOString()).select('user_id');checked(error);
  if(!lock?.length)throw Error('SESSION_BUSY');
  // Re-read after acquiring the cross-instance lock; another request may have refreshed.
  record=await row(hash,id);tokens=openSession(record.encrypted_session,binding(hash,id),process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try{
   if(!tokens.expires_at||tokens.expires_at*1000<Date.now()+60000){
    const refreshed=await publicClient().auth.refreshSession({refresh_token:tokens.refresh_token});
    if(refreshed.error||!refreshed.data.session||refreshed.data.session.user.id!==id){if(refreshed.error?.status&&refreshed.error.status>=500)throw Error('SESSION_BUSY');await markExpired(id);throw Error('ACCOUNT_EXPIRED')}
    const {access_token,refresh_token,expires_at}=refreshed.data.session;tokens={access_token,refresh_token,expires_at};
    const {error}=await admin().from(TABLE).update({encrypted_session:sealSession(tokens,binding(hash,id),process.env.SUPABASE_SERVICE_ROLE_KEY!)}).eq('browser_hash',hash).eq('user_id',id).eq('refresh_nonce',nonce);checked(error);
   }
  }finally{await admin().from(TABLE).update({refresh_lock_until:new Date(0).toISOString(),refresh_nonce:null}).eq('browser_hash',hash).eq('user_id',id).eq('refresh_nonce',nonce)}
 }
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{...noStore,global:{headers:{Authorization:'Bearer '+tokens.access_token}}});
 const {data,error}=await db.auth.getUser(tokens.access_token);if(error||data.user?.id!==id){if(error?.status&&error.status>=500)throw Error('SESSION_BUSY');await markExpired(id);throw Error('ACCOUNT_EXPIRED')}
 return {db,user:data.user};
}
export async function logoutAccount(id:string){
 const hash=await identity();if(!hash)throw Error('UNAUTHORIZED');const record=await row(hash,id);
 // Remove this browser's access even if the remote revoke endpoint is unavailable.
 try{const t=openSession<Tokens>(record.encrypted_session,binding(hash,id),process.env.SUPABASE_SERVICE_ROLE_KEY!);await admin().auth.admin.signOut(t.access_token,'local')}catch{}
 const {error}=await admin().from(TABLE).delete().eq('browser_hash',hash).eq('user_id',id);checked(error);
 const current=await accountList();if(current.activeId)(await cookies()).set(ACTIVE,current.activeId,{httpOnly:true,secure:Boolean(process.env.VERCEL)||process.env.APP_URL?.startsWith('https:'),sameSite:'lax',path:'/',maxAge:2592000});else{(await cookies()).delete(ACTIVE);(await cookies()).delete(COOKIE)}
}
export async function adoptLegacy(){const db=await client();const verified=await db.auth.getUser();if(verified.error||!verified.data.user)return false;const {data}=await db.auth.getSession();if(!data.session)return false;await addSession(data.session);await clearAuthCookies();return true}
export async function clearAuthCookies(prefix?:string){const jar=await cookies();for(const c of jar.getAll())if(prefix?c.name.startsWith(prefix):/^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))jar.set(c.name,'',{httpOnly:true,path:'/',maxAge:0})}
