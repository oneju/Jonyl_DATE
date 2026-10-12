import {existsSync,readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
const production=process.argv.includes('--production');
const env={...(!production&&existsSync('.env.local')?parseEnv(readFileSync('.env.local','utf8')):{}),...process.env};
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_TOKEN_ENCRYPTION_KEY','APP_URL'];
const issues=[];
for(const name of required){const ready=Boolean(env[name]?.trim());console.log(`${ready?'설정됨':'누락'}: ${name}`);if(!ready)issues.push(name+' 미설정');}
if(env.GOOGLE_TOKEN_ENCRYPTION_KEY&&!/^[0-9a-f]{64}$/i.test(env.GOOGLE_TOKEN_ENCRYPTION_KEY))issues.push('GOOGLE_TOKEN_ENCRYPTION_KEY는 64자리 16진수 필요');
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','APP_URL']){if(!env[name])continue;try{const url=new URL(env[name]);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error();if(url.protocol==='http:'&&!['localhost','127.0.0.1'].includes(url.hostname))issues.push(name+' 공개 주소는 HTTPS 필요');if(production&&(url.protocol!=='https:'||['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname)))issues.push(name+' 메인 서비스는 공개 HTTPS 주소 필요');if(name==='APP_URL'&&url.pathname!=='/')issues.push('APP_URL은 하위 경로 없는 사이트 주소 필요');}catch{issues.push(name+' URL 형식 확인 필요')}}
console.log(issues.length?'설정 점검 미완료 — docs/setup.md 참고':'설정 형식 확인 완료 — 실제 로그인·Google 연동 테스트 필요');
for(const issue of issues)console.log('- '+issue);
process.exitCode=issues.length?1:0;
