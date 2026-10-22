import {test} from 'node:test';import assert from 'node:assert/strict';import {authOrigin} from '../lib/auth-origin';
test('운영 콜백은 내부 localhost·위조 요청 호스트 대신 공개 APP_URL 사용',()=>{
 const env={VERCEL:'1',VERCEL_ENV:'production',APP_URL:'https://jongil.example'};
 assert.equal(authOrigin('http://localhost:3000/auth/callback',env),'https://jongil.example');assert.equal(authOrigin('https://attacker.example/auth/callback',env),'https://jongil.example');
 for(const APP_URL of ['http://localhost:3000','https://localhost:3000','https://jongil.example/path','https://user:pass@jongil.example','https://jongil.example?x=1'])assert.throws(()=>authOrigin('http://localhost:3000',{...env,APP_URL}));
});
test('로컬은 로컬로, Preview는 등록된 배포 호스트로 돌아감',()=>{
 assert.equal(authOrigin('http://localhost:3000/auth/callback',{APP_URL:'https://jongil.example'}),'http://localhost:3000');assert.equal(authOrigin('http://localhost:3000',{VERCEL:'1',VERCEL_ENV:'preview',VERCEL_URL:'preview.vercel.app',APP_URL:'https://jongil.example'}),'https://preview.vercel.app');
});
