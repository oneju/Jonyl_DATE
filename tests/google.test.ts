import {test} from 'node:test';import assert from 'node:assert/strict';import {fromGoogle,externalUuid} from '../lib/google-mapping';import {fresh,eventSchema} from '../lib/domain';
const g={id:'remote123',summary:'예약',start:{dateTime:'2026-10-09T05:00:00Z'},end:{dateTime:'2026-10-09T06:00:00Z'}};
test('Google UTC 일정은 서울14시로 변환',()=>{const e=fromGoogle('A','primary',g)!;assert.equal(e.start,'2026-10-09T14:00');assert.equal(eventSchema.safeParse(e).success,true)});
test('재가져오기 ID는 안정적이며 사용자·캘린더별 분리',()=>{assert.equal(externalUuid('A','x','1'),externalUuid('A','x','1'));assert.notEqual(externalUuid('A','x','1'),externalUuid('B','x','1'));assert.notEqual(externalUuid('A','x','1'),externalUuid('A','y','1'))});
test('원본 시간 갱신 시 사용자 계획 보존',()=>{const old={...fresh(),prep:30,travel:20,buffer:10,memo:'내 메모',items:[{id:crypto.randomUUID(),text:'서류',done:true}]};const e=fromGoogle('A','x',g,old)!;assert.equal(e.prep,30);assert.equal(e.items[0].done,true);assert.equal(e.memo,'내 메모');assert.equal(e.start,'2026-10-09T14:00')});
test('취소 일정은 가져오기에서 제외',()=>assert.equal(fromGoogle('A','x',{...g,status:'cancelled'}),null));
test('Google 날짜형은 마지막날 제외 날짜를 보존',()=>{const e=fromGoogle('A','x',{id:'date',start:{date:'2026-07-17'},end:{date:'2026-07-20'}})!;assert.equal(e.allDay,true);assert.equal(e.end,'2026-07-20')});
