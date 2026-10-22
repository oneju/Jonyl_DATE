"use client";
import {useEffect,useState} from 'react';

import {credentials} from '@/lib/validation';
export default function EmailAuth({onComplete}:{onComplete:()=>void|Promise<void>}){
 const [mode,setMode]=useState<'login'|'signup'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[cooldown,setCooldown]=useState(false),[pendingEmail,setPendingEmail]=useState('');
 useEffect(()=>{if(!cooldown)return;const id=setTimeout(()=>setCooldown(false),60000);return()=>clearTimeout(id)},[cooldown]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');setMessage('');
  const issue=credentials(email,password,mode==='signup',confirmation);if(issue){setError(issue);return}
  setBusy(true);
  try{
   const response=await fetch('/api/auth/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,email:email.trim(),password,confirmation})});
   const result=await response.json();if(!response.ok)throw Error(result.error??'요청을 완료하지 못했어요');
   setPassword('');setConfirmation('');
   if(result.account){await onComplete();return}
   setPendingEmail(email.trim());setMessage('가입 요청을 접수했어요. 인증 메일이 도착하면 링크를 눌러 가입을 완료해 주세요. 이미 가입한 주소라면 로그인 또는 비밀번호 재설정을 이용해 주세요.');
  }catch(error){setError(error instanceof Error?error.message:'연결 상태를 확인해 주세요')}finally{setBusy(false)}
 }
 async function resend(){
  if(busy||cooldown)return;setBusy(true);setError('');setMessage('');
  try{const response=await fetch('/api/auth/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resend',email:pendingEmail})});const result=await response.json();if(!response.ok)throw Error(result.error??'메일을 요청하지 못했어요');setMessage('인증 메일 재발송을 요청했어요. 스팸 메일함도 확인해 주세요.');setCooldown(true)}catch(error){setError(error instanceof Error?error.message:'연결 상태를 확인해 주세요')}finally{setBusy(false)}
 }
 return <form noValidate onSubmit={submit}>
  <div className="row-buttons" role="group" aria-label="이메일 계정 메뉴">{(['login','signup'] as const).map(value=><button key={value} type="button" aria-pressed={mode===value} className={mode===value?'primary':'secondary'} disabled={busy} onClick={()=>{setMode(value);setError('');setMessage('');setPassword('');setConfirmation('')}}>{value==='login'?'이메일 로그인':'이메일로 가입'}</button>)}</div>
  <label>이메일<input type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>{setEmail(e.target.value);setPendingEmail('');setCooldown(false)}} required disabled={busy}/></label>
  <label>비밀번호<input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/></label>
  {mode==='signup'&&<><p className="fine">비밀번호는 8자 이상 입력해 주세요.</p><label>비밀번호 확인<input type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={busy}/></label></>}
  {error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
  <button className="primary" type="submit" disabled={busy}>{busy?'처리 중…':mode==='signup'?'가입하고 인증 메일 받기':'로그인'}</button>
  {pendingEmail&&<button type="button" className="secondary" disabled={busy||cooldown} onClick={resend}>{cooldown?'재발송을 요청했어요':'인증 메일 다시 받기'}</button>}
  <a className="text-button" href="/reset-password">비밀번호를 잊으셨나요?</a>
 </form>
}
