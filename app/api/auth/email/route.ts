import {pendingClient} from '@/lib/supabase-server';import {addSession,adoptLegacy,clearAuthCookies,storeReady} from '@/lib/account-session';import {authOrigin} from '@/lib/auth-origin';import {credentials,authError} from '@/lib/validation';import {responseError,sameOrigin} from '@/lib/server';import {z} from 'zod';
export async function POST(r:Request){try{
 sameOrigin(r);let body;try{body=await r.json()}catch{return Response.json({error:'입력을 확인해 주세요'},{status:400})}
 if(!['login','signup','resend'].includes(body?.action)||typeof body.email!=='string'||body.email.length>254||!z.email().safeParse(body.email.trim()).success)return Response.json({error:'이메일 주소 형식을 확인해 주세요'},{status:400});
 if(body.action!=='resend'){
 if(typeof body.password!=='string'||body.password.length>256)return Response.json({error:'비밀번호를 확인해 주세요'},{status:400});
 const issue=credentials(body.email,body.password,body.action==='signup',body.confirmation);if(issue)return Response.json({error:issue},{status:400});
 }
 await storeReady();await adoptLegacy();const db=await pendingClient();const email=body.email.trim(),redirectTo=authOrigin(r.url)+'/auth/callback';
 if(body.action==='resend'){const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:redirectTo}});if(error)return Response.json({error:authError(error)},{status:error.status===429?429:400});return Response.json({ok:true})}
 const result=body.action==='login'?await db.auth.signInWithPassword({email,password:body.password}):await db.auth.signUp({email,password:body.password,options:{emailRedirectTo:redirectTo}});
 if(result.error)return Response.json({error:authError(result.error)},{status:result.error.status===429?429:400});
 if(result.data.session){const account=await addSession(result.data.session);await clearAuthCookies('jongil-login');return Response.json({ok:true,account})}
 return Response.json({ok:true,confirmationRequired:true});
}catch(e){return responseError(e)}}
