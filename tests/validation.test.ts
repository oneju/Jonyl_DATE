import {test} from 'node:test';import assert from 'node:assert/strict';
import {integerInput,credentials,eventError} from '../lib/validation';
import {addDays,local,eventSchema,fresh} from '../lib/domain';
test('빈 숫자·문자·소수·음수·초과값은 한국어 오류, 선택 횟수는 빈 값 허용',()=>{
 for(const raw of ['', 'abc','1.5','-1','1441','1e3'])assert.match(integerInput(raw,'준비 시간',0,1440).error!,/입력/);
 assert.equal(integerInput('0','준비 시간',0,1440).value,0);assert.equal(integerInput('','종료 횟수',1,999,true).value,null);
});
test('가입 입력은 빈 이메일·잘못된 형식·짧은 비밀번호·확인 불일치 거부',()=>{
 assert.match(credentials('','abcdefgh',true,'abcdefgh'),/이메일/);assert.match(credentials('abc','abcdefgh',true,'abcdefgh'),/형식/);assert.match(credentials('a@example.com','abc',true,'abc'),/8자/);assert.match(credentials('a@example.com','abcdefgh',true,'different'),/일치/);assert.equal(credentials(' a@example.com ','abcdefgh',true,'abcdefgh'),'');
});
test('지운 날짜·NaN은 화면 계산을 중단하고 원시 Invalid 오류를 노출하지 않음',()=>{
 assert.equal(addDays('',1),'');assert.equal(local(NaN),'');
 const result=eventSchema.safeParse({...fresh(),title:'검증',prep:NaN});assert.equal(result.success,false);if(!result.success)assert.match(eventError(result.error),/준비 시간/);
});
