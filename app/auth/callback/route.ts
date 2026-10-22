import {cookies} from 'next/headers';import {client,pendingClient} from '@/lib/supabase-server';import {addSession,clearAuthCookies} from '@/lib/account-session';import {authOrigin} from '@/lib/auth-origin';
export async function GET(r:Request){
 const url=new URL(r.url);let origin;try{origin=authOrigin(r.url)}catch{return Response.json({error:'서비스 로그인 주소 설정이 필요해요. 관리자에게 문의해 주세요.'},{status:503})}
 const recovery=url.searchParams.get('next')==='/reset-password';
 try{
  const code=url.searchParams.get('code');if(code){
   const pending=!recovery&&(await cookies()).getAll().some(c=>c.name.startsWith('jongil-login-code-verifier'));
   const db=pending?await pendingClient():await client();const {data,error}=await db.auth.exchangeCodeForSession(code);
   if(!error&&data.session){if(recovery)return Response.redirect(new URL('/reset-password?verified=1',origin));await addSession(data.session);await clearAuthCookies(pending?'jongil-login':undefined);return Response.redirect(new URL('/?auth=connected',origin))}
  }
 }catch(e){if(e instanceof Error&&e.message==='MULTI_ACCOUNT_SETUP_REQUIRED')return Response.redirect(new URL('/?auth=setup',origin))}
 return Response.redirect(new URL(recovery?'/reset-password?auth=error':'/?auth=error',origin));
}
