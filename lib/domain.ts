import {z} from 'zod';
const baseSchema=z.object({id:z.uuid(),title:z.string().trim().min(1,'제목을 입력해 주세요').max(80),start:z.string(),end:z.string(),allDay:z.boolean(),location:z.string().max(200),memo:z.string().max(2000),color:z.enum(['blue','green','purple','orange','pink','gray']),prep:z.number().int().min(0).max(1440),travel:z.number().int().min(0).max(1440),buffer:z.number().int().min(0).max(180),travelMode:z.enum(['walk','transit','car','other']),items:z.array(z.object({id:z.uuid(),text:z.string().trim().min(1).max(100),done:z.boolean()})).max(30),repeat:z.enum(['none','daily','weekly','monthly','yearly']),repeatInterval:z.number().int().min(1).max(99),repeatCount:z.number().int().min(1).max(999).nullable(),repeatUntil:z.string().nullable(),exceptions:z.record(z.string(),z.object({deleted:z.boolean().optional(),override:z.record(z.string(),z.unknown()).optional(),checks:z.record(z.string(),z.boolean()).optional()})),nextId:z.string().regex(/^[0-9a-f-]{36}(?:@\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)?$/i).nullable(),reminder:z.enum(['none','appointment','prep','departure']).default('none'),reminderOffset:z.number().int().min(0).max(60).default(0),source:z.enum(['local','google']),externalId:z.string().nullable(),calendarId:z.string().nullable(),revision:z.number().int().min(0)});
export const eventSchema=baseSchema.superRefine((e,c)=>{if(!validTime(e.start,e.allDay)||!validTime(e.end,e.allDay)||time(e.end,e.allDay)<=time(e.start,e.allDay))c.addIssue({code:'custom',path:['end'],message:'종료 날짜와 시간을 시작보다 늦게 입력해 주세요'});if(e.nextId){const [id,occurrence]=e.nextId.split('@');if(!z.uuid().safeParse(id).success||id===e.id||(occurrence&&!validTime(occurrence,occurrence.length===10)))c.addIssue({code:'custom',message:'연결할 다음 일정 정보를 확인해 주세요'});}if(new Set(e.items.map(i=>i.id)).size!==e.items.length)c.addIssue({code:'custom',message:'중복된 준비물 ID가 있어요'});for(const [k,x] of Object.entries(e.exceptions)){if(!validTime(k,e.allDay))c.addIssue({code:'custom',message:'유효하지 않은 반복 발생일이에요'});if(x.override){const m={...e,...x.override,exceptions:{}} as Event;if(!baseSchema.safeParse(m).success)c.addIssue({code:'custom',message:'반복 예외의 입력을 확인해 주세요'});if(!validTime(m.start,m.allDay)||!validTime(m.end,m.allDay)||time(m.end,m.allDay)<=time(m.start,m.allDay))c.addIssue({code:'custom',message:'반복 예외의 시간을 확인해 주세요'});}}if(e.allDay&&e.reminder!=='none'&&e.reminder!=='appointment')c.addIssue({code:'custom',message:'하루 종일 일정의 알림 대상을 확인해 주세요'});if(e.allDay&&(e.prep||e.travel||e.buffer||e.nextId))c.addIssue({code:'custom',message:'하루 종일 일정에는 시간 계획과 연결을 사용할 수 없어요'});if(e.repeatUntil&&(!validTime(e.repeatUntil,true)||e.repeatUntil<e.start.slice(0,10)))c.addIssue({code:'custom',message:'반복 종료 날짜를 시작 날짜 이후로 선택해 주세요'});if(e.repeatUntil&&e.repeatCount)c.addIssue({code:'custom',message:'반복 종료 날짜 또는 횟수 중 하나만 선택해 주세요'});});
export type Event=z.infer<typeof eventSchema>;
export type Occurrence=Event&{baseId:string;key:string;originalStart:string};
const dateFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
const timeFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export const day=(d=new Date())=>dateFormatter.format(d);
export const addDays=(d:string,n:number)=>{const ms=Date.parse(d+'T00:00:00Z')+n*86400000;return Number.isFinite(ms)?new Date(ms).toISOString().slice(0,10):''};
export const time=(v:string,allDay=false)=>Date.parse(v+(allDay?'T00:00:00+09:00':'+09:00'));
export function validTime(v:string,allDay:boolean){const re=allDay?/^\d{4}-\d{2}-\d{2}$/:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;if(!re.test(v)||!Number.isFinite(time(v,allDay)))return false;const y=Number(v.slice(0,4));return y>=1900&&y<=2100&&local(time(v,allDay)).slice(0,allDay?10:16)===v;}
export function local(ms:number){if(!Number.isFinite(ms))return '';return timeFormatter.format(new Date(ms)).replace(' ','T');}
export const fmt=(v:string)=>v.replace('T',' ').slice(5);
export const planned=(e:Event)=>({arrival:local(time(e.start)-e.buffer*60000),departure:local(time(e.start)-(e.travel+e.buffer)*60000),preparation:local(time(e.start)-(e.prep+e.travel+e.buffer)*60000)});
export const gap=(a:Event,b:Event)=>Math.round((time(b.start)-time(a.end))/60000)-b.prep-b.travel-b.buffer;
export const overlaps=(a:Event,b:Event)=>time(a.start,a.allDay)<time(b.end,b.allDay)&&time(b.start,b.allDay)<time(a.end,a.allDay);
function slot(e:Event,n:number){const d=e.start.slice(0,10),stamp=e.start.slice(10),base=new Date(d+'T00:00:00Z');if(e.repeat==='daily'||e.repeat==='weekly')return addDays(d,n*e.repeatInterval*(e.repeat==='weekly'?7:1))+stamp;const month=e.repeat==='monthly'?base.getUTCMonth()+n*e.repeatInterval:base.getUTCMonth();const year=base.getUTCFullYear()+(e.repeat==='yearly'?n*e.repeatInterval:0);const next=new Date(Date.UTC(year,month,base.getUTCDate()));if(next.getUTCDate()!==base.getUTCDate()||(e.repeat==='yearly'&&next.getUTCMonth()!==base.getUTCMonth()))return null;return next.toISOString().slice(0,10)+stamp;}
export function expand(events:Event[],from:string,to:string):Occurrence[]{const result:Occurrence[]=[];const lo=time(from,true),hi=time(to,true);for(const e of events){let count=0;for(let n=0;n<75000;n++){if(e.repeat==='none'&&n>0)break;const start=slot(e,n);if(!start)continue;if(start.slice(0,4)>'2100')break;if(e.repeatUntil&&start.slice(0,10)>e.repeatUntil)break;if(e.repeatCount&&count>=e.repeatCount)break;count++;const key=e.repeat==='none'?e.id:e.id+'@'+start;const ex=e.exceptions[start];if(time(start,e.allDay)+time(e.end,e.allDay)-time(e.start,e.allDay)<=lo&&!ex?.override)continue;let end=local(time(start,e.allDay)+time(e.end,e.allDay)-time(e.start,e.allDay));if(e.allDay)end=end.slice(0,10);const o={...e,start,end,...ex?.override,items:((ex?.override?.items as Event['items']|undefined)??e.items).map(i=>({...i,done:ex?.checks?.[i.id]??(e.repeat==='none'?i.done:false)})),baseId:e.id,key,originalStart:start} as Occurrence;if(!ex?.deleted&&time(o.start,o.allDay)<hi&&time(o.end,o.allDay)>lo)result.push(o);if(time(start,e.allDay)>=hi){/* moved exceptions are added separately */break;}}for(const [original,ex] of Object.entries(e.exceptions)){if(original.slice(0,10)<to||!ex.override||ex.deleted)continue;const start=String(ex.override.start??original),end=String(ex.override.end??e.end);if(time(start,e.allDay)<hi&&time(end,e.allDay)>lo&&!result.some(x=>x.key===e.id+'@'+original))result.push({...e,...ex.override,start,end,baseId:e.id,key:e.id+'@'+original,originalStart:original} as Occurrence);}}return result.sort((a,b)=>time(a.start,a.allDay)-time(b.start,b.allDay)||time(a.end,a.allDay)-time(b.end,b.allDay)||a.key.localeCompare(b.key));}
export function fresh(date=day()):Event{return {id:crypto.randomUUID(),title:'',start:date+'T14:00',end:date+'T15:00',allDay:false,location:'',memo:'',color:'blue',prep:0,travel:0,buffer:0,travelMode:'transit',items:[],repeat:'none',repeatInterval:1,repeatCount:null,repeatUntil:null,exceptions:{},nextId:null,reminder:'none',reminderOffset:0,source:'local',externalId:null,calendarId:null,revision:0}}
export function samples(date=day()){const a={...fresh(date),title:'병원 예약',location:'서울 ○○의원',prep:30,travel:30,buffer:10,items:[{id:crypto.randomUUID(),text:'신분증',done:false},{id:crypto.randomUUID(),text:'진료 서류',done:false}]};const b={...fresh(date),title:'스터디 모임',start:date+'T16:30',end:date+'T18:00',location:'동네 카페',prep:15,travel:40,buffer:10,color:'purple' as const};a.nextId=b.id;return [a,b]}

/** Resolve occurrence keys even when the target lies outside the displayed month. */
export function connection(e:Event,events:Event[]):{target?:Occurrence;problem?:string}{
 if(!e.nextId)return {};
 const [id,original]=e.nextId.split('@');const base=events.find(x=>x.id===id);
 if(!base)return {problem:'연결한 일정이 삭제됐어요. 다음 일정을 다시 선택해 주세요.'};
 const from=String((original&&base.exceptions[original]?.override?.start)||original||base.start).slice(0,10);
 const target=expand([base],from,addDays(from,1)).find(x=>x.key===e.nextId);
 if(!target)return {problem:'연결한 반복 일정이 변경됐어요. 다음 일정을 다시 선택해 주세요.'};
 if(target.allDay||e.allDay||target.start<=e.start)return {problem:'연결한 일정의 시간 순서가 바뀌었어요. 다음 일정을 다시 선택해 주세요.'};
 return {target};
}
export function deleteLocalEvent(events:Event[],id:string,expected:number):Event[]{
 const current=events.find(x=>x.id===id);
 if(!current||current.revision!==expected)throw Error('수정 충돌이에요. 새로 불러온 뒤 다시 확인해 주세요');
 return events.filter(x=>x.id!==id).map(e=>{
  let changed=false;const clear=(value:string|null)=>{if(value?.split('@')[0]===id){changed=true;return null}return value};
  const nextId=clear(e.nextId);const exceptions=Object.fromEntries(Object.entries(e.exceptions).map(([k,v])=>[k,v.override?.nextId?{...v,override:{...v.override,nextId:clear(String(v.override.nextId))}}:v]));
  return changed?{...e,nextId,exceptions,revision:e.revision+1}:e;
 });
}
export function parseBackup(value:unknown):Event[]{
 if(!value||typeof value!=='object')throw Error('유효한 종일 백업 파일이 아니에요');
 const b=value as {version?:number;events?:unknown};
 if(b.version!==1||!Array.isArray(b.events)||b.events.length>10000)throw Error('유효한 종일 백업 파일이 아니에요');
 const events=b.events.map(e=>eventSchema.parse(e));
 if(new Set(events.map(e=>e.id)).size!==events.length)throw Error('백업에 중복된 일정 ID가 있어요');
 return events;
}
