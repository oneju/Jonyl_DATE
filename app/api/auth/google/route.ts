import {pendingClient} from '@/lib/supabase-server';import {adoptLegacy,storeReady} from '@/lib/account-session';import {authOrigin} from '@/lib/auth-origin';import {responseError} from '@/lib/server';
export async function GET(r:Request){try{
 const origin=authOrigin(r.url);await storeReady();await adoptLegacy();const db=await pendingClient();
 const {data,error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/auth/callback',queryParams:{prompt:'select_account'},skipBrowserRedirect:true}});
 if(error||!data.url)throw Error('AUTH_FAILED');return Response.redirect(data.url);
}catch(e){return responseError(e)}}
