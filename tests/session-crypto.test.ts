import {test} from 'node:test';import assert from 'node:assert/strict';import {sealSession,openSession,browserHash} from '../lib/session-crypto';
test('계정·브라우저에 묶인 세션 암호화: 원문 비노출·다른 계정·위변조·키 변경 차단',()=>{
 const token={access_token:'test-access-token',refresh_token:'test-refresh-token',expires_at:2000000000},secret='test-server-secret';const binding=browserHash('browser-a')+':account-a';
 const sealed=sealSession(token,binding,secret);assert.deepEqual(openSession(sealed,binding,secret),token);assert.equal(sealed.includes(token.access_token),false);assert.notEqual(sealSession(token,binding,secret),sealed);
 assert.throws(()=>openSession(sealed,browserHash('browser-b')+':account-a',secret));assert.throws(()=>openSession(sealed,browserHash('browser-a')+':account-b',secret));assert.throws(()=>openSession(sealed,binding,'different-server-key'));
 const bytes=Buffer.from(sealed,'base64url');bytes[bytes.length-1]^=1;assert.throws(()=>openSession(bytes.toString('base64url'),binding,secret));assert.throws(()=>openSession('x',binding,secret));
});
