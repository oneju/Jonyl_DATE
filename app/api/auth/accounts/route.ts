import {cookies} from 'next/headers';
import {accountList,adoptLegacy,logoutAccount} from '@/lib/account-session';
import {client,responseError,sameOrigin} from '@/lib/server';
export async function GET(){try{
 const result=await accountList();if(result.accounts.length)return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 const db=await client();const {data}=await db.auth.getUser();return Response.json(data.user?{accounts:[{id:data.user.id,email:data.user.email??'회원',expired:false}],activeId:data.user.id,legacy:true}:result,{headers:{'Cache-Control':'no-store'}});
}catch(e){return responseError(e)}}
export async function POST(r:Request){try{sameOrigin(r);const body=await r.json();if(body.action==='adopt')await adoptLegacy();else if(body.action==='select'){
 const result=await accountList();if(!result.accounts.some(a=>a.id===body.accountId&&!a.expired))return Response.json({error:'로그인된 계정을 선택해 주세요'},{status:403});
 (await cookies()).set('jongil-active-account',body.accountId,{httpOnly:true,secure:Boolean(process.env.VERCEL),sameSite:'lax',path:'/',maxAge:2592000});
}else return Response.json({error:'요청을 확인해 주세요'},{status:400});return Response.json(await accountList(),{headers:{'Cache-Control':'no-store'}})}catch(e){return responseError(e)}}
export async function DELETE(r:Request){try{sameOrigin(r);const body=await r.json();const list=await accountList();
 if(body.all===true){for(const account of list.accounts)await logoutAccount(account.id)}else{
 if(!list.accounts.some(a=>a.id===body.accountId))return Response.json({error:'로그인된 계정을 선택해 주세요'},{status:403});await logoutAccount(body.accountId);
 }return Response.json(await accountList(),{headers:{'Cache-Control':'no-store'}});
}catch(e){return responseError(e)}}
