import {requestAccount} from '@/lib/account-request';
import {admin,responseError,sameOrigin} from '@/lib/server';
export async function DELETE(r:Request){
 try{
  sameOrigin(r);const {user,db}=await requestAccount(r);
  let body;try{body=await r.json()}catch{return Response.json({error:'삭제 확인 문구를 입력해 주세요'},{status:400})}
  if(body?.confirm!=='계정 삭제')return Response.json({error:'‘계정 삭제’를 정확히 입력해 주세요'},{status:400});
  // One Auth deletion cascades the user's rows in the same DB transaction.
  // Never delete calendar data first: a failed Auth deletion must leave it intact.
  const {error}=await admin().auth.admin.deleteUser(user.id);
  if(error){console.error('Account deletion failed',{code:error.code,status:error.status});return Response.json({error:'회원 탈퇴를 완료하지 못했어요. 데이터는 유지됩니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.'},{status:503})}
  // The account is already gone; failure to revoke a stale session is harmless.
  try{await db.auth.signOut()}catch{}
  return Response.json({ok:true});
 }catch(e){return responseError(e)}
}
