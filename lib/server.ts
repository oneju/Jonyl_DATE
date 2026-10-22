import {authOrigin} from '@/lib/auth-origin';
import {client} from './supabase-server';
import {accountClient} from './account-session';
export {client,admin} from './supabase-server';
export async function authenticated(accountId?:string){if(accountId)return accountClient(accountId);const db=await client();const {data,error}=await db.auth.getUser();if(error||!data.user)throw Error('UNAUTHORIZED');return {db,user:data.user}}
export function responseError(e:unknown){const m=e instanceof Error?e.message:'';if(m==='MULTI_ACCOUNT_SETUP_REQUIRED')return Response.json({error:'다중 계정 DB 설정이 필요해요. 관리자에게 문의해 주세요.',code:m},{status:503});if(m==='ACCOUNT_EXPIRED')return Response.json({error:'이 계정에 다시 로그인해 주세요',code:m},{status:401});if(m==='SESSION_BUSY')return Response.json({error:'로그인 정보를 갱신하고 있어요. 잠시 후 다시 시도해 주세요.',code:m},{status:409});return Response.json({error:m==='UNAUTHORIZED'?'로그인이 필요해요':m==='SETUP_REQUIRED'?'서비스 연결 설정이 필요해요':m==='CONFLICT'?'다른 곳에서 수정한 일정이에요. 새로 불러온 뒤 다시 확인해 주세요':'요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요'},{status:m==='UNAUTHORIZED'?401:m==='SETUP_REQUIRED'?503:m==='CONFLICT'?409:500})}
export function sameOrigin(r:Request){const origin=r.headers.get('origin');if(!origin||origin!==authOrigin(r.url))throw Error('UNAUTHORIZED')}
