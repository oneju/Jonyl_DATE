'use client';
import {useState} from 'react';
import {MapPin,Pencil,Trash2} from 'lucide-react';
import {Occurrence,Event,addDays,fmt,planned,connection,gap} from '@/lib/domain';
export default function EventDetail({event:e,events,busy,onToggle,onEdit,onRemove}:{event:Occurrence;events:Event[];busy:boolean;onToggle:(o:Occurrence,id:string)=>void;onEdit:(o:Occurrence)=>void;onRemove:(o:Occurrence)=>void}){
 const [tab,setTab]=useState('info'),[page,setPage]=useState(0);const compact=e.memo.length>180||e.items.length>3,linked=connection(e,events);
 const tabs=[['info','일정 정보'],...(e.memo?[['memo','메모']]:[]),...(e.items.length?[['items','준비물']]:[])];
 const memoPages=Math.max(1,Math.ceil(e.memo.length/240)),itemPages=Math.max(1,Math.ceil(e.items.length/4)),pages=tab==='memo'?memoPages:itemPages;
 const checks=(items:Occurrence['items'])=>items.map(i=><label className="check-row" key={i.id}><input type="checkbox" checked={i.done} onChange={()=>onToggle(e,i.id)}/>{i.text}</label>);
 return <>
 <p className="muted">{fmt(e.start)} — {e.allDay?fmt(addDays(e.end,-1)):fmt(e.end)} {e.allDay?'· 하루 종일':''}</p>
 {compact&&<div className="popup-tabs" role="tablist" aria-label="상세 내용">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>{setTab(id);setPage(0)}}>{label}</button>)}</div>}
 {(!compact||tab==='info')&&<><div className="detail-list"><p><MapPin size={17}/>{e.location||'장소 미정'}</p>{!e.allDay&&<><p>준비 시작<strong>{fmt(planned(e).preparation)}</strong></p><p>출발<strong>{fmt(planned(e).departure)}</strong></p><p>도착 목표<strong>{fmt(planned(e).arrival)}</strong></p><p>이동수단<strong>{{walk:'도보',transit:'대중교통',car:'자동차',other:'기타'}[e.travelMode]} · {e.travel}분</strong></p></>}{!compact&&e.memo&&<p className="memo">{e.memo}</p>}</div>{linked.target&&<p className="fine">다음 일정: {linked.target.title} · {gap(e,linked.target)>=0?gap(e,linked.target)+'분 여유':-gap(e,linked.target)+'분 부족'}</p>}{linked.problem&&<p className="error">{linked.problem}</p>}{!compact&&checks(e.items)}</>}
 {compact&&tab==='memo'&&<p className="paged-memo">{e.memo.slice(page*240,page*240+240)}</p>}
 {compact&&tab==='items'&&checks(e.items.slice(page*4,page*4+4))}
 {compact&&tab!=='info'&&<div className="popup-pagination"><button disabled={!page} onClick={()=>setPage(n=>n-1)}>이전 내용</button><span>{page+1} / {pages}</span><button disabled={page+1>=pages} onClick={()=>setPage(n=>n+1)}>다음 내용</button></div>}
 <div className="row-buttons"><button className="primary" onClick={()=>onEdit(e)}><Pencil size={17}/>{e.source==='google'?'준비 계획 수정':'수정'}</button><button className="secondary danger" onClick={()=>onRemove(e)} disabled={busy}><Trash2 size={17}/>삭제</button></div>
 </>;
}
