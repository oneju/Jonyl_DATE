"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  UserRound,
  Clock3,
  MapPin,
  ArrowUpRight,
  Check,
  Link2,
  LogOut,
  Settings2,
  X,
  Trash2,
  Pencil,
  ArrowRight,
  Download,
  Upload,
} from "lucide-react";
import TimeGrid from "./TimeGrid";
import MonthCalendar from "./MonthCalendar";
import EventDetail from "./EventDetail";
import EmailAuth from "./EmailAuth";
import {integerInput, eventError} from "@/lib/validation";
import { configured } from "@/lib/supabase-client";
import {
  addDays,
  day,
  type Event,
  type Occurrence,
  eventSchema,
  expand,
  fmt,
  fresh,
  gap,
  overlaps,
  planned,
  samples,
  time,
  connection,
  deleteLocalEvent,
  parseBackup,
  validTime,
} from "@/lib/domain";
type Mode = "today" | "calendar" | "search" | "account";
type User = { id: string; email: string; demo: boolean; expired?: boolean };
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const BASEKEY = "jongil.demo.";
const COLORS = {
  blue: "하늘",
  green: "초록",
  purple: "보라",
  orange: "주황",
  pink: "분홍",
  gray: "회색",
};
async function api(url: string, method = "GET", body?: unknown, accountId?: string) {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(accountId ? {"x-jongil-account":accountId} : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const d = await r.json().catch(()=>{throw Error("서버 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.")});
  if (!r.ok) throw Error(d.error ?? "요청을 처리하지 못했어요");
  return d;
}
export default function Jongil({ allowTest = false }: { allowTest?: boolean }) {
  const [user, setUser] = useState<User | null>(null),
    [accounts, setAccounts] = useState<User[]>([]),
    [hiddenAccounts, setHiddenAccounts] = useState<string[]>([]),
    [authRevision, setAuthRevision] = useState(0),
    [draftAccountId, setDraftAccountId] = useState(""),
    [filterOpen, setFilterOpen] = useState(false),
    [events, setEvents] = useState<Event[]>([]),
    [mode, setMode] = useState<Mode>("calendar"),
    [date, setDate] = useState(day()),
    [view, setView] = useState<"month" | "week" | "day" | "year">("month"),
    [colorFilter, setColorFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [detail, setDetail] = useState<Occurrence | null>(null),
    [draft, setDraft] = useState<Event | null>(null),
    [editing, setEditing] = useState<Occurrence | null>(null),
    [scope, setScope] = useState("series"),
    [busy, setBusy] = useState(false),
    [authOpen, setAuthOpen] = useState(false),
    [numberInputs, setNumberInputs] = useState<Record<string,string>>({});
  const [confirmation, setConfirmation] = useState<{
      message: string;
      input: boolean;
    } | null>(null),
    [confirmationValue, setConfirmationValue] = useState("");
  const confirmationRef = useRef<HTMLDialogElement>(null),
    confirmationResolve = useRef<((value: boolean | string) => void) | null>(
      null,
    ),
    confirmationFocus = useRef<HTMLElement | null>(null);
  const [dayPopup, setDayPopup] = useState<string | null>(null),
    [popupPage, setPopupPage] = useState(0),
    [formTab, setFormTab] = useState("basic");
  const authDialog = useRef<HTMLDialogElement>(null);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const authEpoch = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null),
    draftKey = useRef(""),
    returnFocus = useRef<HTMLElement | null>(null);
  const [now, setNow] = useState(Date.now());
  const monthStart = date.slice(0, 7) + "-01",
    offset = new Date(monthStart + "T12:00:00Z").getUTCDay(),
    gridStart = addDays(monthStart, -offset),
    gridEnd = addDays(gridStart, 42);
  const filteredEvents = events.filter(e=>!e.accountId||!hiddenAccounts.includes(e.accountId));
  const visible = expand(filteredEvents, gridStart, gridEnd),
    daily = visible
      .filter((e) => e.start.slice(0, 10) <= date && e.end.slice(0, 10) >= date)
      .filter((e) => (e.allDay ? e.end > date : e.end > date + "T00:00"));
  const first = [...daily]
    .filter((e) => !e.allDay)
    .sort((a, b) =>
      planned(a).preparation.localeCompare(planned(b).preparation),
    )[0];
  const popupEvents = daily.filter(
    (e) => colorFilter === "all" || e.color === colorFilter,
  );
  const sheet = Boolean(draft || detail || authOpen || dayPopup);
  const demo = Boolean(user?.demo);
  useEffect(() => {
    if (confirmation) {
      confirmationFocus.current = document.activeElement as HTMLElement;
      confirmationRef.current?.showModal();
    } else if (confirmationRef.current?.open) {
      confirmationRef.current.close();
      confirmationFocus.current?.focus();
    }
  }, [confirmation]);
  function ask(message: string, input = false) {
    setConfirmationValue("");
    setConfirmation({ message, input });
    return new Promise<boolean | string>((resolve) => {
      confirmationResolve.current = resolve;
    });
  }
  function answer(value: boolean | string) {
    confirmationResolve.current?.(value);
    confirmationResolve.current = null;
    setConfirmation(null);
  }
  function confirmationSheet() {
    return (
      <dialog
        className="sheet confirm-sheet"
        aria-label="작업 확인"
        ref={confirmationRef}
        onCancel={(e) => {
          e.preventDefault();
          answer(false);
        }}
      >
        <h2>확인해 주세요</h2>
        <p>{confirmation?.message}</p>
        {confirmation?.input && (
          <label>
            확인 문구
            <input
              autoFocus
              value={confirmationValue}
              onChange={(e) => setConfirmationValue(e.target.value)}
            />
          </label>
        )}
        <div className="row-buttons">
          <button className="secondary" onClick={() => answer(false)}>
            취소
          </button>
          <button
            className="primary"
            onClick={() =>
              answer(confirmation?.input ? confirmationValue : true)
            }
          >
            확인
          </button>
        </div>
      </dialog>
    );
  }
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (sheet && !authOpen && !dialog.current?.open) {
      returnFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else if ((!sheet || authOpen) && dialog.current?.open) {
      dialog.current.close();
      returnFocus.current?.focus();
    }
  }, [sheet, authOpen]);
  useEffect(() => {
    if (dialog.current) dialog.current.scrollTop = 0;
  }, [draft?.id, detail?.key, dayPopup, formTab]);
  useEffect(() => {
    if (authOpen && !authDialog.current?.open) authDialog.current?.showModal();
    else if (!authOpen && authDialog.current?.open) authDialog.current.close();
  }, [authOpen]);
  useEffect(() => {
    if (allowTest) {
      const id = localStorage.getItem("jongil.demo.active");
      if (id === "A" || id === "B")
        setUser({ id, email: "테스트 사용자 " + id, demo: true });
    setAccounts([]);
      setLoading(false);
      return;
    }
    try{setHiddenAccounts(JSON.parse(localStorage.getItem('jongil.hidden-accounts')??'[]'))}catch{}
    refreshAccounts();
    const refresh=(e:StorageEvent)=>{if(e.key==='jongil.auth-refresh')refreshAccounts()};window.addEventListener('storage',refresh);
    return()=>{authEpoch.current++;window.removeEventListener('storage',refresh)};
  }, [allowTest]);
  useEffect(() => {
    setEvents([]);
    setError("");
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    load(user, () => active);
    return () => {
      active = false;
    };
  }, [user?.id, user?.demo, authRevision]);
  useEffect(() => {
    if (!user) return;
    for (const e of expand(filteredEvents, addDays(day(), -1), addDays(day(), 2))) {
      if (e.reminder === "none") continue;
      const p = e.allDay ? null : planned(e);
      const at =
        time(
          e.reminder === "prep"
            ? p!.preparation
            : e.reminder === "departure"
              ? p!.departure
              : e.start,
          e.allDay,
        ) -
        e.reminderOffset * 60000;
      const key = "jongil.delivered." + user.id + "." + e.key + "." + at;
      if (now >= at && now - at < 60000 && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        setNotice(
          e.title +
            " · " +
            (e.reminder === "prep"
              ? "준비 시작"
              : e.reminder === "departure"
                ? "출발"
                : "약속") +
            "을 확인해 주세요",
        );
      }
    }
  }, [now, events, user, hiddenAccounts]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if(p.get("auth")==="setup")setError("다중 계정 DB 설정이 필요해요. 관리자에게 문의해 주세요.");
    if (p.get("auth") === "error")
      setError(
        "연결하지 못했어요. 설정과 권한을 확인한 뒤 다시 시도해 주세요.",
      );
  }, []);
  useEffect(()=>{if(filterOpen&&!filterDialog.current?.open)filterDialog.current?.showModal();else if(!filterOpen&&filterDialog.current?.open)filterDialog.current?.close()},[filterOpen]);
  async function refreshAccounts(){
    if(allowTest)return;
    const epoch=++authEpoch.current;
    try{
      let data=await api('/api/auth/accounts');
      if(data.legacy)data=await api('/api/auth/accounts','POST',{action:'adopt'});
      if(epoch!==authEpoch.current)return;
      const list:User[]=data.accounts.map((a:User)=>({...a,demo:false}));
      setAccounts(list);setUser(list.find(a=>a.id===data.activeId)??list.find(a=>!a.expired)??list[0]??null);setAuthRevision(n=>n+1);
      if(!list.length)setEvents([]);
    }catch(e){if(epoch===authEpoch.current)setError((e as Error).message)}finally{if(epoch===authEpoch.current)setLoading(false)}
  }
  async function selectAccount(id:string){
    if(busy)return;setBusy(true);try{await api('/api/auth/accounts','POST',{action:'select',accountId:id});await refreshAccounts()}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  function toggleAccount(id:string){setHiddenAccounts(ids=>{const next=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];localStorage.setItem('jongil.hidden-accounts',JSON.stringify(next));return next})}
  function accountFilters(){return <fieldset className="account-filters"><legend>표시할 계정</legend>{accounts.map(a=><label className="account-filter-row" key={a.id}><input type="checkbox" aria-label={a.email+' 일정 표시'} checked={!hiddenAccounts.includes(a.id)} onChange={()=>toggleAccount(a.id)}/><span title={a.email}>{a.email}{a.expired?' · 재로그인 필요':''}</span></label>)}<button type="button" className="text-button" onClick={()=>{setHiddenAccounts([]);localStorage.setItem('jongil.hidden-accounts','[]')}}>전체 표시</button></fieldset>}
  async function load(u = user, isCurrent = () => true) {
    if (!u) return;
    setLoading(true);
    try {
      if (u.demo) {
        const stored = localStorage.getItem(BASEKEY + u.id);
        const data = stored ? JSON.parse(stored) : [];
        if (
          !Array.isArray(data) ||
          data.some((e) => !eventSchema.safeParse(e).success)
        )
          throw Error(
            "저장된 테스트 데이터를 읽지 못했어요. 백업 파일을 확인해 주세요.",
          );
        if (isCurrent())
          setEvents(data.map((e: Event) => eventSchema.parse(e)));
      } else {
        const data = await api("/api/events?accounts=all");
        if (isCurrent()) {
          setEvents(data.events);
          if(data.accounts)setAccounts(data.accounts.map((a:User)=>({...a,demo:false})));
          if(data.failures?.length)setError("일부 계정의 일정을 불러오지 못했어요. 계정 화면에서 재로그인하거나 다시 불러와 주세요.");
        }
      }
    } catch (e) {
      if (isCurrent()) setError((e as Error).message);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }
  function persistLocal(next: Event[]) {
    if (!user) throw Error("사용자를 선택해 주세요");
    localStorage.setItem(BASEKEY + user.id, JSON.stringify(next));
    setEvents(next);
  }
  async function save(e: Event) {
    const parsed = eventSchema.safeParse(e);
    if (!parsed.success) throw Error(eventError(parsed.error));
    if (demo) {
      const latest: Event[] = JSON.parse(
        localStorage.getItem(BASEKEY + user!.id) ?? "[]",
      );
      const current = latest.find((x) => x.id === e.id);
      if (
        (current && current.revision !== e.revision) ||
        (!current && e.revision > 0)
      )
        throw Error("수정 충돌이에요. 새로 불러온 뒤 다시 확인해 주세요");
      const saved = { ...parsed.data, revision: e.revision + 1 };
      persistLocal([...latest.filter((x) => x.id !== e.id), saved]);
      return saved;
    }
    const owner=e.accountId||draftAccountId||user!.id;
    const saved = {...(await api("/api/events", "POST", e,owner)).event,accountId:owner,accountEmail:accounts.find(a=>a.id===owner)?.email} as Event;
    setEvents((es) => [...es.filter((x) => x.id !== saved.id), saved]);
    return saved;
  }
  function enterDemo(id = "A") {
    if (!allowTest) return;
    localStorage.setItem("jongil.demo.active", id);
    setUser({ id, email: "테스트 사용자 " + id, demo: true });
    setAccounts([]);
    setMode("calendar");
    setView("month");
    setDate(day());
  }
  async function logout(accountId=user?.id,all=false) {
    if(busy&&!demo)return;setBusy(true);
    try{
      if(!demo){const remaining=await api('/api/auth/accounts','DELETE',all?{all:true}:{accountId});await refreshAccounts();localStorage.setItem('jongil.auth-refresh',String(Date.now()));if(!remaining.accounts.length)setMode('calendar')}
      else{localStorage.removeItem('jongil.demo.active');setUser(null);setEvents([]);setMode('calendar')}
      setView('month');setDate(day());
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  async function googleLogin() {
    if(!configured()){setError('서비스 연결 설정이 필요해요');return}
    // Server initiates PKCE using a separate pending-login cookie; existing accounts remain.
    location.assign('/api/auth/google');
  }
  async function close(force = false) {
    if (
      draft &&
      !force &&
      JSON.stringify(draft) !== draftKey.current &&
      !(await ask("입력한 변경을 버리고 닫을까요?"))
    )
      return;
    setDraft(null);
    setDetail(null);
    setDayPopup(null);
    setAuthOpen(false);
    setError("");
  }
  function edit(o?: Occurrence, selectedDate = date) {
    if (!user) {
      setAuthOpen(true);
      setError("일정을 저장하려면 로그인해 주세요.");
      return;
    }
    const e = o ? events.find((x) => x.id === o.baseId)! : fresh(selectedDate);
    setDraftAccountId(e.accountId||user.id);
    setNumberInputs({});
    setFormTab("basic");
    setDayPopup(null);
    setEditing(o ?? null);
    setScope(o && e.repeat !== "none" ? "single" : "series");
    const d = o ? { ...e, start: o.start, end: o.end, items: o.items } : e;
    setDraft(d);
    draftKey.current = JSON.stringify(d);
    setDetail(null);
    setError("");
  }
  function update<K extends keyof Event>(key: K, value: Event[K]) {
    setDraft((e) => (e ? { ...e, [key]: value } : null));
  }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!draft || busy) return;
    setError("");
    setBusy(true);
    try {
      let e = { ...draft };
      if (e.allDay) {
        e = { ...e, prep: 0, travel: 0, buffer: 0, nextId: null };
      }
      for (const [key,raw] of Object.entries(numberInputs)) {
        if ((e.allDay && ["prep","travel","buffer"].includes(key)) || (e.repeat === "none" && ["repeatInterval","repeatCount"].includes(key))) continue;
        const labels:Record<string,string>={prep:"준비 시간",travel:"이동 시간",buffer:"도착 여유",repeatInterval:"반복 간격",repeatCount:"종료 횟수"};
        const result=integerInput(raw,labels[key],key==="repeatInterval"||key==="repeatCount"?1:0,key==="buffer"?180:key==="repeatInterval"?99:key==="repeatCount"?999:1440,key==="repeatCount");
        if(result.error){setFormTab(["repeatInterval","repeatCount"].includes(key)?"extra":"plan");throw Error(result.error)}
        Object.assign(e,{[key]:result.value});
      }
      const parsed = eventSchema.safeParse(e);
      if (!parsed.success) {
        const key=String(parsed.error.issues[0]?.path[0]);
        setFormTab(["prep","travel","buffer"].includes(key)?"plan":["items","repeatCount","repeatInterval","repeatUntil"].includes(key)?"extra":"basic");
        throw Error(eventError(parsed.error));
      }
      const os = expand(
        filteredEvents.filter((x) => x.id !== e.id),
        e.start.slice(0, 10),
        addDays(e.end.slice(0, 10), 2),
      );
      let warning = os.some((x) => overlaps(e, x))
        ? "기존 일정과 시간이 겹쳐요. 그대로 저장할까요?"
        : "";
      if (e.nextId) {
        const linked = connection(e, events.filter(x=>x.accountId === (e.accountId || (demo?undefined:draftAccountId))));
        if (linked.problem) throw Error(linked.problem);
        const next = linked.target!;
        if (gap(e, next) < 0)
          warning = `다음 일정 준비와 이동에 ${-gap(e, next)}분이 부족해요. 그대로 저장할까요?`;
      }
      if (warning && !(await ask(warning))) return;
      if (editing && scope === "single" && e.repeat !== "none") {
        const base = events.find((x) => x.id === editing.baseId)!;
        const { exceptions, revision, ...override } = e;
        e = {
          ...base,
          exceptions: {
            ...base.exceptions,
            [editing.originalStart]: {
              ...base.exceptions[editing.originalStart],
              override,
            },
          },
          revision: base.revision,
          accountId:base.accountId,accountEmail:base.accountEmail,
        };
      }
      await save(e);
      close(true);
      setNotice(editing ? "일정을 수정했어요" : "새 일정을 저장했어요");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(o: Occurrence) {
    if (
      !(await ask(
        o.repeat === "none"
          ? "이 일정을 삭제할까요?"
          : "이번 발생일을 삭제할까요? 전체 삭제는 수정 화면에서 선택할 수 있어요.",
      ))
    )
      return;
    setBusy(true);
    try {
      const base = events.find((x) => x.id === o.baseId)!;
      if (base.repeat !== "none")
        await save({
          ...base,
          exceptions: {
            ...base.exceptions,
            [o.originalStart]: { deleted: true },
          },
        });
      else if (demo)
        persistLocal(
          deleteLocalEvent(
            JSON.parse(localStorage.getItem(BASEKEY + user!.id) ?? "[]"),
            base.id,
            base.revision,
          ),
        );
      else {
        await api("/api/events", "DELETE", {
          id: base.id,
          revision: base.revision,
        },base.accountId||user!.id);
        await load();
      }
      close(true);
      setNotice("일정을 삭제했어요");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(o: Occurrence, itemId: string) {
    const base = events.find((e) => e.id === o.baseId)!;
    const item = o.items.find((x) => x.id === itemId)!;
    try {
      const updated =
        base.repeat === "none"
          ? {
              ...base,
              items: base.items.map((x) =>
                x.id === itemId ? { ...x, done: !item.done } : x,
              ),
            }
          : {
              ...base,
              exceptions: {
                ...base.exceptions,
                [o.originalStart]: {
                  ...base.exceptions[o.originalStart],
                  checks: {
                    ...base.exceptions[o.originalStart]?.checks,
                    [itemId]: !item.done,
                  },
                },
              },
            };
      await save(updated);
      if (detail)
        setDetail({
          ...o,
          items: o.items.map((x) =>
            x.id === itemId ? { ...x, done: !item.done } : x,
          ),
        });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function changeMonth(n: number) {
    const d = new Date(date + "T12:00:00Z");
    const old = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    const last = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(old, last));
    setDate(d.toISOString().slice(0, 10));
  }
  function backup() {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, exportedAt: new Date().toISOString(), events:events.filter(e=>demo||e.accountId===user?.id) },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jongil-backup-" + day() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function restore(file: File) {
    try {
      if (file.size > 5242880) throw Error("5MiB 이하 파일을 선택해 주세요");
      const d = JSON.parse(await file.text());
      const restored = parseBackup(d);
      if (
        !(await ask(
          `${user?.email} 계정의 일정을 백업의 ${d.events.length}개 일정으로 교체할까요? 다른 계정은 유지됩니다.`,
        ))
      )
        return;
      if (demo) persistLocal(restored);
      else {
        await api("/api/events", "PUT", { version: 1, events: restored },user!.id);
        await load();
      }
      setNotice("백업을 복원했어요");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const cards = (all: Occurrence[]) => {
    const list = all.filter(
      (e) => colorFilter === "all" || e.color === colorFilter,
    );
    return list.length ? (
      <div className="events">
        {list.map((o) => {
          const linked = connection(o, events.filter(e=>e.accountId===o.accountId)),
            next = linked.target;
          const valid = Boolean(next);
          return (
            <div key={o.key}>
              <button
                className={"event-card tone-" + o.color}
                onClick={() => {
                  setDayPopup(null);
                  setDetail(o);
                  setError("");
                }}
              >
                <span className="event-time">
                  {o.allDay ? "하루 종일" : o.start.slice(11)}
                  <span>{o.allDay ? "" : o.end.slice(11)}</span>
                </span>
                <span className="event-content">
                  <span className="event-title">
                    {o.title}
                    <ArrowUpRight size={17} />
                  </span>
                  {o.accountEmail&&<small className="account-badge">{o.accountEmail}</small>}
                  {o.location && (
                    <span className="muted location">
                      <MapPin size={13} />
                      {o.location}
                    </span>
                  )}
                  {!o.allDay && (o.prep || o.travel) ? (
                    <span className="plan-tags">
                      준비 {fmt(planned(o).preparation)} · 출발{" "}
                      {fmt(planned(o).departure)}
                    </span>
                  ) : null}
                  {o.source === "google" && (
                    <small>이전에 가져온 일정</small>
                  )}
                </span>
              </button>
              {valid && next && (
                <div className={"gap " + (gap(o, next) < 0 ? "negative" : "")}>
                  <Link2 size={13} />
                  다음 일정까지{" "}
                  {gap(o, next) >= 0
                    ? `${gap(o, next)}분 여유`
                    : `${-gap(o, next)}분 부족`}
                </div>
              )}
              {linked.problem && (
                <p className="gap negative" role="status">
                  {linked.problem}
                </p>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="empty">
        <CalendarDays size={34} />
        <h3>아직 일정이 없어요</h3>
        <p>약속과 준비 계획을 함께 추가해 보세요.</p>
        <button className="primary" onClick={() => edit()}>
          첫 일정 추가
        </button>
      </div>
    );
  };
  if (!user && allowTest)
    return (
      <main className="welcome">
        <div className="logo">
          <Clock3 /> 종일
        </div>
        <span className="eyebrow">테스트 전용 공간</span>
        <h1>
          하루를 계획하는
          <br />
          작은 준비.
        </h1>
        <p>
          테스트 사용자 A/B로 일정을 만들어보세요.
          <br />
          실제 회원 데이터와 분리됩니다.
        </p>
        <button className="primary" onClick={() => enterDemo()}>
          테스트 모드로 시작 <ArrowRight size={18} />
        </button>
        <a className="text-button" href="/">
          일반 홈으로 이동
        </a>
        <p className="fine">테스트 데이터는 이 브라우저에만 저장됩니다.</p>
      </main>
    );
  function authSheet() {
    return (
      <dialog
        aria-label="회원 로그인"
        ref={authDialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        className="sheet"
      >
        <div className="sheet-head">
          <h2>{accounts.length?"다른 계정 추가":"이메일 로그인 / 가입"}</h2>
          <button onClick={() => close()} aria-label="닫기">
            <X />
          </button>
        </div>
        <p className="muted">계정을 만들고 여러 기기에서 일정을 이어보세요.</p>
        <button
          className="secondary"
          onClick={googleLogin}
          disabled={busy || !configured()}
        >
          Google로 로그인{!configured() ? " · 설정 필요" : ""}
        </button>
        <EmailAuth onComplete={async() => {await close(true);await refreshAccounts();localStorage.setItem('jongil.auth-refresh',String(Date.now()))}} />
      </dialog>
    );
  }
  const searchList = expand(
    filteredEvents,
    addDays(date, -366),
    addDays(date, 366),
  ).filter(
    (o) =>
      query.trim() &&
      [o.title, o.location, o.memo].some((x) =>
        x.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
  );
  return (
    <main
      className={"shell mode-" + mode + (view === "month" ? " view-month" : "")}
    >
      <header>
        <a
          className="logo"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setMode("calendar");
            setView("month");
            setDate(day());
          }}
        >
          <Clock3 />
          종일
        </a>
        <div>
          <button
            onClick={() => {
              setMode("calendar");
              setView("month");
            }}
            aria-label="달력 열기"
          >
            <CalendarDays />
          </button>
          <button className="add" onClick={() => edit()} aria-label="일정 추가">
            <Plus />
          </button>
        </div>
      </header>
      <aside className="desktop-sidebar" aria-label="데스크톱 메뉴">
        <button className="primary sidebar-add" onClick={() => edit()}>
          <Plus size={17} /> 새 일정
        </button>
        <nav aria-label="주 메뉴">
          {(
            [
              { id: "calendar", label: "달력", icon: CalendarDays },
              { id: "today", label: "오늘", icon: Clock3 },
              { id: "search", label: "검색", icon: Search },
              { id: "account", label: "계정", icon: UserRound },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={mode === n.id ? "active" : ""}
              onClick={() => {
                setMode(n.id);
                if (n.id === "today") setDate(day());
              }}
            >
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-colors">
          <h2>일정 색상</h2>
          <button
            aria-pressed={colorFilter === "all"}
            onClick={() => setColorFilter("all")}
          >
            <CalendarDays size={15} />
            전체 일정
          </button>
          {Object.entries(COLORS).map(([key, label]) => (
            <button
              key={key}
              aria-pressed={colorFilter === key}
              onClick={() => setColorFilter(key)}
            >
              <i className={"dot tone-" + key} />
              {label}
            </button>
          ))}
        </div>
        {!demo&&accounts.length>0&&<div className="desktop-account-filters">{accountFilters()}</div>}
        <div className="sidebar-footer">
          <Clock3 size={20} />
          <strong>하루를 조금 더 여유롭게.</strong>
          <p>
            {demo
              ? "테스트 전용 공간 · 브라우저 저장"
              : user
                ? "내 계정으로 일정과 준비를 이어보세요."
                : "로그인하고 나만의 하루를 계획하세요."}
          </p>
          {demo ? (
            <a href="/">일반 홈으로 이동</a>
          ) : !user ? (
            <button className="secondary" onClick={() => setAuthOpen(true)}>
              로그인 / 가입
            </button>
          ) : (
            <button className="secondary" onClick={() => setMode("account")}>
              계정 관리
            </button>
          )}
        </div>
      </aside>
      <div className="mode-banner">
        {demo
          ? "테스트 모드 · /test 전용"
          : user
            ? "내 계정 · 클라우드에 저장"
            : "로그인하면 일정을 저장할 수 있어요"}
        <button onClick={() => (user ? setMode("account") : setAuthOpen(true))}>
          {demo ? "사용자 " + user!.id : user ? "계정 관리" : "로그인"}
        </button>
      </div>
      {!demo&&accounts.length>0&&<div className="mobile-account-controls"><button className="secondary" onClick={()=>setFilterOpen(true)}>계정 필터 · {accounts.filter(a=>!hiddenAccounts.includes(a.id)).length}/{accounts.length}</button></div>}
      <div className="workspace-content">
        {!demo&&accounts.length>0&&accounts.every(a=>hiddenAccounts.includes(a.id))&&<p role="status" className="filter-empty">표시할 계정을 선택해 주세요. 계정 필터를 켜면 일정이 표시됩니다.</p>}
        {error && !sheet && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => load()}>다시 불러오기</button>
          </div>
        )}
        {loading ? (
          <div className="empty">일정을 불러오고 있어요…</div>
        ) : (
          <>
            {mode === "today" && (
              <>
                <div className="date-heading">
                  <div>
                    <p>
                      {new Date(date + "T12:00:00Z").getUTCFullYear()}년{" "}
                      {Number(date.slice(5, 7))}월
                    </p>
                    <h1>
                      {Number(date.slice(8))}일{" "}
                      <span>
                        {WEEK[new Date(date + "T12:00:00Z").getUTCDay()]}요일
                      </span>
                    </h1>
                  </div>
                  {date !== day(new Date(now)) && (
                    <button
                      className="pill today-return"
                      onClick={() => setDate(day())}
                    >
                      오늘로 이동
                    </button>
                  )}
                </div>
                <div className="week-strip">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = addDays(date, i - 3);
                    return (
                      <button
                        key={d}
                        className={d === date ? "selected" : ""}
                        onClick={() => setDate(d)}
                      >
                        <small>
                          {WEEK[new Date(d + "T12:00:00Z").getUTCDay()]}
                        </small>
                        <strong>{Number(d.slice(8))}</strong>
                        <span
                          className={
                            expand(filteredEvents, d, addDays(d, 1)).length ? "dot" : ""
                          }
                        />
                      </button>
                    );
                  })}
                </div>
                {first && (
                  <section className="first-plan">
                    <div>
                      <span>
                        <Clock3 size={16} /> 오늘의 첫 준비
                      </span>
                      <small>
                        {new Date(now).toLocaleTimeString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        기준
                      </small>
                    </div>
                    <h2>
                      {planned(first).preparation.slice(11)}{" "}
                      <span>준비 시작</span>
                    </h2>
                    <p>
                      {first.title} · {first.start.slice(11)} 약속
                    </p>
                    {first.items.length > 0 && (
                      <div className="checks">
                        {first.items.map((i) => (
                          <label key={i.id}>
                            <input
                              type="checkbox"
                              checked={i.done}
                              onChange={() => toggle(first, i.id)}
                            />
                            {i.text}
                          </label>
                        ))}
                      </div>
                    )}
                  </section>
                )}
                <div className="section-title">
                  <h2>오늘의 일정</h2>
                  <span>{daily.length}개의 일정</span>
                </div>
                {cards(daily)}
                <p className="endnote">하루를 조금 더 여유롭게.</p>
              </>
            )}
            {mode === "calendar" && (
              <>
                <div className="month-title">
                  <button
                    onClick={() =>
                      view === "week"
                        ? setDate(addDays(date, -7))
                        : view === "day"
                          ? setDate(addDays(date, -1))
                          : changeMonth(view === "year" ? -12 : -1)
                    }
                    aria-label={
                      view === "week"
                        ? "이전 주"
                        : view === "day"
                          ? "이전 날"
                          : view === "year"
                            ? "이전 해"
                            : "이전 달"
                    }
                  >
                    <ChevronLeft />
                  </button>
                  <h1>
                    {date.slice(0, 4)}년 {Number(date.slice(5, 7))}월
                  </h1>
                  {date !== day(new Date(now)) && (
                    <button
                      className="pill today-return"
                      onClick={() => setDate(day())}
                    >
                      오늘로 이동
                    </button>
                  )}
                  <button
                    onClick={() =>
                      view === "week"
                        ? setDate(addDays(date, 7))
                        : view === "day"
                          ? setDate(addDays(date, 1))
                          : changeMonth(view === "year" ? 12 : 1)
                    }
                    aria-label={
                      view === "week"
                        ? "다음 주"
                        : view === "day"
                          ? "다음 날"
                          : view === "year"
                            ? "다음 해"
                            : "다음 달"
                    }
                  >
                    <ChevronRight />
                  </button>
                </div>
                <div className="segmented">
                  {(["month", "week", "day"] as const).map((v, i) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={v === view ? "active" : ""}
                    >
                      {["월", "주", "일"][i]}
                    </button>
                  ))}
                </div>
                <label className="color-filter">
                  표시 색상
                  <select
                    value={colorFilter}
                    onChange={(e) => setColorFilter(e.target.value)}
                  >
                    <option value="all">전체 색상</option>
                    {Object.entries(COLORS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                {view === "month" && (
                  <MonthCalendar
                    date={date}
                    today={day(new Date(now))}
                    events={visible}
                    color={colorFilter}
                    onDate={(d) => {
                      setDate(d);
                      edit(undefined, d);
                    }}
                    onOpen={(o) => {
                      setDate(o.start.slice(0, 10));
                      setDayPopup(null);
                      setDetail(o);
                      setError("");
                    }}
                    onMore={(d) => {
                      setDate(d);
                      setDayPopup(d);
                      setPopupPage(0);
                    }}
                  />
                )}
                {view === "year" && (
                  <div className="year-grid">
                    {Array.from({ length: 12 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setDate(
                            date.slice(0, 4) +
                              "-" +
                              String(i + 1).padStart(2, "0") +
                              "-01",
                          );
                          setView("month");
                        }}
                      >
                        <strong>{i + 1}월</strong>
                        <span>
                          {new Date(
                            Number(date.slice(0, 4)),
                            i + 1,
                            0,
                          ).getDate()}
                          일
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {view === "week" ? (
                  Array.from({ length: 7 }, (_, i) => {
                    const d = addDays(date, i);
                    return (
                      <section key={d}>
                        <div className="section-title">
                          <h2>
                            {fmt(d)}{" "}
                            {WEEK[new Date(d + "T12:00:00Z").getUTCDay()]}
                          </h2>
                        </div>
                        <TimeGrid
                          date={d}
                          events={expand(filteredEvents, d, addDays(d, 1)).filter(
                            (e) =>
                              colorFilter === "all" || e.color === colorFilter,
                          )}
                          onOpen={setDetail}
                        />
                      </section>
                    );
                  })
                ) : view === "day" ? (
                  <>
                    <div className="section-title">
                      <h2>
                        {Number(date.slice(5, 7))}월 {Number(date.slice(8))}일
                      </h2>
                      <span>{daily.length}개</span>
                    </div>
                    {view === "day" ? (
                      <TimeGrid
                        date={date}
                        events={daily.filter(
                          (e) =>
                            colorFilter === "all" || e.color === colorFilter,
                        )}
                        onOpen={setDetail}
                      />
                    ) : (
                      cards(daily)
                    )}
                  </>
                ) : null}
              </>
            )}
            {mode === "search" && (
              <>
                <div className="page-heading">
                  <span className="eyebrow">필요한 일정을 빠르게</span>
                  <h1>일정 검색</h1>
                </div>
                <label className="searchbox">
                  <Search size={20} />
                  <input
                    aria-label="일정 검색"
                    placeholder="제목, 장소, 메모 검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <p className="muted">
                  선택 날짜의 전후 1년 내 일정을 검색합니다.
                </p>
                {query ? (
                  cards(searchList)
                ) : (
                  <div className="empty">검색어를 입력해 주세요.</div>
                )}
              </>
            )}
            {mode === "account" && user && (
              <>
                <div className="page-heading">
                  <span className="eyebrow">나의 하루를 안전하게</span>
                  <h1>계정과 연결</h1>
                </div>
                {!demo&&<section className="settings-card column" aria-label="로그인된 계정"><h2>로그인된 계정</h2>{accounts.map(a=><div className="account-manage-row" key={a.id}><div><strong>{a.email}</strong><p className="fine">{a.expired?'재로그인 필요':a.id===user.id?'현재 관리 계정':'로그인 유지 중'}</p></div>{!a.expired&&<button className="secondary" disabled={busy||a.id===user.id} onClick={()=>selectAccount(a.id)}>관리 계정 선택</button>}{a.expired&&<button className="secondary" onClick={()=>setAuthOpen(true)}>재로그인</button>}<button className="text-button" disabled={busy} aria-label={a.email+' 로그아웃'} onClick={()=>logout(a.id)}>이 계정 로그아웃</button></div>)}<button className="primary" disabled={busy} onClick={()=>setAuthOpen(true)}>다른 계정 추가</button>{accounts.length>1&&<button className="text-button" disabled={busy} onClick={async()=>{if(await ask('이 브라우저의 모든 계정에서 로그아웃할까요?'))await logout(undefined,true)}}>전체 계정 로그아웃</button>}</section>}
                <section className="settings-card">
                  <UserRound />
                  <div>
                    <strong>{user.email}</strong>
                    <p>
                      {demo
                        ? "체험용 사용자 · 실제 회원 계정 아님"
                        : "로그인된 회원"}
                    </p>
                  </div>
                </section>
                {demo && (
                  <div className="row-buttons">
                    <button
                      className="secondary"
                      onClick={() => enterDemo(user.id === "A" ? "B" : "A")}
                    >
                      테스트 사용자 {user.id === "A" ? "B" : "A"}로 전환
                    </button>
                    <button
                      className="secondary"
                      onClick={async () => {
                        if (
                          !(await ask(
                            "현재 테스트 데이터에 예시 일정을 추가할까요?",
                          ))
                        )
                          return;
                        persistLocal([...events, ...samples(date)]);
                        setNotice("예시 일정을 추가했어요");
                      }}
                    >
                      예시 일정 추가
                    </button>
                  </div>
                )}
                <section className="settings-card column">
                  <div className="settings-title">
                    <Settings2 />
                    <h2>내 데이터</h2>
                    {!demo&&<small>{user.email} 계정만</small>}
                  </div>
                  <p className="fine">
                    시간대: 서울 · 알림: 화면 내 안내만 지원
                    <br />홈 화면 설치는 지원하며, 오프라인 편집·종료 앱 푸시는
                    후속 작업입니다.
                  </p>
                  <button className="secondary" onClick={backup}>
                    <Download size={17} /> 백업 내보내기
                  </button>
                  <label className="secondary upload">
                    <Upload size={17} /> 백업 복원
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) restore(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </section>
                <button
                  className="text-button danger"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      (await ask(
                        "계정과 모든 일정을 삭제하려면 ‘계정 삭제’를 입력해 주세요.",
                        true,
                      )) !== "계정 삭제"
                    )
                      return;
                    if (busy) return;
                    setBusy(true);
                    try {
                      if (demo) {
                        localStorage.removeItem(BASEKEY + user.id);
                        await logout();
                      } else {
                        await api("/api/account", "DELETE", {
                          confirm: "계정 삭제",
                        },user.id);
                        await refreshAccounts();
                      }
                      setNotice("계정과 데이터를 삭제했어요");
                    } catch (e) {
                      setError((e as Error).message);
                    } finally { setBusy(false); }
                  }}
                >
                  {busy ? "처리 중…" : demo ? "현재 테스트 데이터 삭제" : "회원 탈퇴·데이터 삭제"}
                </button>
                {!demo && (
                  <a className="text-button" href="/reset-password">
                    비밀번호 재설정
                  </a>
                )}
                <button className="text-button logout" onClick={()=>logout()}>
                  <LogOut size={17} /> 로그아웃
                </button>
              </>
            )}
            {mode === "account" && !user && (
              <section className="guest-account">
                <UserRound size={36} />
                <h1>내 계정으로 시작하기</h1>
                <p>로그인하면 여러 기기에서 일정을 이어볼 수 있어요.</p>
                <button
                  className="primary"
                  onClick={googleLogin}
                  disabled={busy || !configured()}
                >
                  Google로 로그인
                </button>
                <button className="secondary" onClick={() => setAuthOpen(true)}>
                  이메일 로그인 / 가입
                </button>
              </section>
            )}{" "}
          </>
        )}
      </div>
      <nav className="bottom-nav">
        {(
          [
            { id: "today", label: "오늘", icon: Clock3 },
            { id: "calendar", label: "달력", icon: CalendarDays },
            { id: "search", label: "검색", icon: Search },
            { id: "account", label: "계정", icon: UserRound },
          ] as const
        ).map((n) => (
          <button
            key={n.id}
            className={mode === n.id ? "active" : ""}
            onClick={() => {
              setMode(n.id);
              if (n.id === "today") setDate(day());
            }}
          >
            <n.icon size={22} />
            {n.label}
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      <dialog
        className={
          "sheet event-popup " +
          (draft ? "editing-popup" : detail ? "detail-popup" : "")
        }
        aria-label="일정과 연결 정보"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="sheet-head">
          <h2>
            {draft
              ? editing
                ? "일정 수정"
                : "새 일정"
              : detail
                ? detail.title
                : dayPopup
                  ? fmt(dayPopup) + " 일정"
                  : "일정"}
          </h2>
          <button onClick={() => close()} aria-label="닫기">
            <X />
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {dayPopup && (
          <>
            <p className="muted">
              일정을 선택하면 상세 내용을 확인할 수 있어요.
            </p>
            {cards(popupEvents.slice(popupPage * 4, popupPage * 4 + 4))}
            <div className="popup-pagination">
              <button
                disabled={!popupPage}
                onClick={() => setPopupPage((n) => n - 1)}
              >
                이전
              </button>
              <span>
                {popupPage + 1} /{" "}
                {Math.max(1, Math.ceil(popupEvents.length / 4))}
              </span>
              <button
                disabled={(popupPage + 1) * 4 >= popupEvents.length}
                onClick={() => setPopupPage((n) => n + 1)}
              >
                다음
              </button>
            </div>
            <button
              className="primary"
              onClick={() => edit(undefined, dayPopup)}
            >
              이 날짜에 일정 추가
            </button>
          </>
        )}
        {detail && (
          <EventDetail
            key={detail.key}
            event={detail}
            events={events.filter(e=>e.accountId===detail.accountId)}
            busy={busy}
            onToggle={toggle}
            onEdit={edit}
            onRemove={remove}
          />
        )}
        {draft && (
          <form
            noValidate
            onSubmit={submit}
            onInvalid={(e) => {
              const section = (e.target as HTMLElement).closest<HTMLElement>(
                "[data-form-tab]",
              );
              if (section) setFormTab(section.dataset.formTab!);
            }}
            className="event-form"
          >
            <div
              className="popup-tabs"
              role="tablist"
              aria-label="일정 입력 항목"
            >
              {[
                ["basic", "기본 정보"],
                ["plan", "준비·이동"],
                ["extra", "추가 설정"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={formTab === id}
                  onClick={() => setFormTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div data-form-tab="basic" hidden={formTab !== "basic"}>
              {!demo&&<label>저장 계정<select aria-label="저장 계정" value={draft.accountId||draftAccountId} disabled={Boolean(editing)} onChange={e=>{setDraftAccountId(e.target.value);setDraft(d=>d?{...d,accountId:e.target.value,accountEmail:accounts.find(a=>a.id===e.target.value)?.email,nextId:null}:null)}}>{accounts.filter(a=>!a.expired||a.id===(draft.accountId||draftAccountId)).map(a=><option key={a.id} value={a.id}>{a.email}{a.expired?' · 재로그인 필요':''}</option>)}</select>{editing&&<small>수정·삭제는 이 일정의 원래 계정에 적용됩니다.</small>}</label>}
              <label>
                제목
                <input
                  required
                  maxLength={80}
                  value={draft.title}

                  onChange={(e) => update("title", e.target.value)}
                  placeholder="어떤 일정인가요?"
                />
              </label>
              <label className="switch-row">
                하루 종일
                <input
                  type="checkbox"
                  checked={draft.allDay}

                  onChange={(e) => {
                    const all = e.target.checked;
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            allDay: all,
                            start: all
                              ? d.start.slice(0, 10)
                              : d.start + "T14:00",
                            end: all
                              ? addDays(d.end.slice(0, 10), 1)
                              : addDays(d.end, -1) + "T15:00",
                            prep: 0,
                            travel: 0,
                            buffer: 0,
                            nextId: null,
                            reminder: "none",
                          }
                        : null,
                    );
                  }}
                />
              </label>
              <div className="pair">
                <label>
                  시작
                  <input
                    required
                    type={draft.allDay ? "date" : "datetime-local"}
                    value={draft.start}

                    onChange={(e) => update("start", e.target.value)}
                  />
                </label>
                <label>
                  종료{draft.allDay ? " (마지막 날 포함)" : ""}
                  <input
                    required
                    type={draft.allDay ? "date" : "datetime-local"}
                    value={draft.allDay ? addDays(draft.end, -1) : draft.end}

                    onChange={(e) =>
                      update(
                        "end",
                        draft.allDay
                          ? addDays(e.target.value, 1)
                          : e.target.value,
                      )
                    }
                  />
                </label>
              </div>
              <label>
                장소
                <input
                  maxLength={200}
                  value={draft.location}

                  onChange={(e) => update("location", e.target.value)}
                  placeholder="선택 입력"
                />
              </label>
              <label>
                메모
                <textarea
                  maxLength={2000}
                  value={draft.memo}
                  onChange={(e) => update("memo", e.target.value)}
                />
              </label>
              <label>
                색상
                <select
                  value={draft.color}
                  onChange={(e) =>
                    update("color", e.target.value as Event["color"])
                  }
                >
                  {Object.entries(COLORS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div data-form-tab="plan" hidden={formTab !== "plan"}>
              {draft.allDay && (
                <p className="muted">
                  하루 종일 일정에는 준비·이동 시간을 계산하지 않아요.
                </p>
              )}
              {!draft.allDay && (
                <details open>
                  <summary>
                    <Clock3 size={17} /> 준비·이동 계획
                  </summary>
                  <div className="pair">
                    {(["prep", "travel", "buffer"] as const).map((k, i) => (
                      <label key={k}>
                        {["준비 시간", "이동 시간", "도착 여유"][i]} (분)
                        <input
                          type="text"
                          inputMode="numeric"
                          min={0}
                          max={k === "buffer" ? 180 : 1440}
                          required
                          value={numberInputs[k] ?? String(draft[k])}
                          onChange={(e) => {
                            const raw=e.target.value;setNumberInputs(n=>({...n,[k]:raw}));
                            if(/^\d+$/.test(raw) && Number(raw)<=1440) update(k,Number(raw));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    이동수단
                    <select
                      value={draft.travelMode}
                      onChange={(e) =>
                        update(
                          "travelMode",
                          e.target.value as Event["travelMode"],
                        )
                      }
                    >
                      <option value="walk">도보</option>
                      <option value="transit">대중교통</option>
                      <option value="car">자동차</option>
                      <option value="other">기타</option>
                    </select>
                  </label>
                  {Number.isFinite(draft.prep + draft.travel + draft.buffer) &&
                    validTime(draft.start, false) && (
                      <p className="calculation">
                        준비 {fmt(planned(draft).preparation)} · 출발{" "}
                        {fmt(planned(draft).departure)}
                      </p>
                    )}
                  <label>
                    다음 일정 연결
                    <select
                      value={draft.nextId ?? ""}
                      onChange={(e) => update("nextId", e.target.value || null)}
                    >
                      <option value="">연결 안 함</option>
                      {draft.nextId && connection(draft, events.filter(e=>e.accountId === (draft.accountId || (demo?undefined:draftAccountId)))).problem && (
                        <option value={draft.nextId}>연결 확인 필요</option>
                      )}
                      {expand(
                        events.filter((e) => e.id !== draft.id && e.accountId === (draft.accountId || (demo?undefined:draftAccountId))),
                        draft.start.slice(0, 10) || date,
                        addDays(draft.start.slice(0, 10) || date, 366),
                      )
                        .filter((e) => !e.allDay && e.start > draft.start)
                        .slice(0, 100)
                        .map((e) => (
                          <option key={e.key} value={e.key}>
                            {fmt(e.start)} {e.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  {draft.nextId && connection(draft, events.filter(e=>e.accountId === (draft.accountId || (demo?undefined:draftAccountId)))).problem && (
                    <p className="error" role="alert">
                      {connection(draft, events.filter(e=>e.accountId === (draft.accountId || (demo?undefined:draftAccountId)))).problem}
                    </p>
                  )}
                  <p className="fine">
                    이동 시간은 직접 입력합니다. 선택한 다음 일정의 준비·이동
                    시간을 빼서 여유를 계산합니다.
                  </p>
                </details>
              )}
            </div>
            <div data-form-tab="extra" hidden={formTab !== "extra"}>
              <label>
                화면 내 알림
                <select
                  value={draft.reminder}
                  onChange={(e) =>
                    update("reminder", e.target.value as Event["reminder"])
                  }
                >
                  <option value="none">알림 없음</option>
                  <option value="appointment">약속 시작</option>
                  {!draft.allDay && (
                    <>
                      <option value="prep">준비 시작</option>
                      <option value="departure">출발</option>
                    </>
                  )}
                </select>
              </label>
              {draft.reminder !== "none" && (
                <label>
                  몇 분 전
                  <select
                    value={draft.reminderOffset}
                    onChange={(e) =>
                      update("reminderOffset", Number(e.target.value))
                    }
                  >
                    {[0, 5, 10, 30, 60].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? "정시" : n + "분 전"}
                      </option>
                    ))}
                  </select>
                  <span className="fine">
                    앱 화면을 열어둔 동안 안내합니다. 앱 종료 후 알림은 아직
                    지원하지 않습니다.
                  </span>
                </label>
              )}
              <details open={draft.items.length > 0}>
                <summary>
                  <Check size={17} /> 준비물{" "}
                  <span>{draft.items.length}/30</span>
                </summary>
                {draft.items.map((i, n) => (
                  <div className="item-edit" key={i.id}>
                    <input
                      aria-label={"준비물 " + (n + 1)}
                      maxLength={100}
                      required
                      value={i.text}
                      onChange={(e) =>
                        update(
                          "items",
                          draft.items.map((x) =>
                            x.id === i.id ? { ...x, text: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label={"준비물 " + (n + 1) + " 삭제"}
                      onClick={() =>
                        update(
                          "items",
                          draft.items.filter((x) => x.id !== i.id),
                        )
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-button"
                  disabled={draft.items.length >= 30}
                  onClick={() =>
                    update("items", [
                      ...draft.items,
                      { id: crypto.randomUUID(), text: "", done: false },
                    ])
                  }
                >
                  + 준비물 추가
                </button>
              </details>
              <details>
                  <summary>
                    <CalendarDays size={17} /> 반복 설정
                  </summary>
                  <label>
                    반복
                    <select
                      value={draft.repeat}
                      onChange={(e) =>
                        update("repeat", e.target.value as Event["repeat"])
                      }
                    >
                      <option value="none">반복 안 함</option>
                      <option value="daily">매일</option>
                      <option value="weekly">매주 (시작 요일)</option>
                      <option value="monthly">매월 (없는 날짜 건너뜀)</option>
                      <option value="yearly">매년</option>
                    </select>
                  </label>
                  {draft.repeat !== "none" && (
                    <>
                      <label>
                        간격
                        <input
                          type="text"
                          inputMode="numeric"
                          min={1}
                          max={99}
                          required
                          value={numberInputs.repeatInterval ?? String(draft.repeatInterval)}
                          onChange={(e) =>
                            setNumberInputs(n=>({...n,repeatInterval:e.target.value}))
                          }
                        />
                      </label>
                      <label>
                        종료 횟수 (선택)
                        <input
                          type="text"
                          inputMode="numeric"
                          min={1}
                          max={999}
                          value={numberInputs.repeatCount ?? String(draft.repeatCount ?? "")}
                          onChange={(e) => {
                            setNumberInputs(n=>({...n,repeatCount:e.target.value}));
                            update("repeatUntil",null);
                          }}
                        />
                      </label>
                      <label>
                        종료 날짜 (선택)
                        <input
                          type="date"
                          min={draft.start.slice(0, 10)}
                          value={draft.repeatUntil ?? ""}
                          onChange={(e) => {
                            setNumberInputs(n=>({...n,repeatCount:""}));
                            setDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    repeatUntil: e.target.value || null,
                                    repeatCount: null,
                                  }
                                : null,
                            );
                          }}
                        />
                      </label>
                    </>
                  )}
                </details>
              {editing && draft.repeat !== "none" && (
                <label>
                  수정 범위
                  <select
                    value={scope}
                    onChange={(e) => {
                      setScope(e.target.value);
                      const base = events.find((x) => x.id === editing.baseId)!;
                      const d =
                        e.target.value === "series"
                          ? base
                          : {
                              ...base,
                              start: editing.start,
                              end: editing.end,
                              items: editing.items,
                            };
                      setNumberInputs({});
                      setDraft(d);
                      draftKey.current = JSON.stringify(d);
                    }}
                  >
                    <option value="single">이번 일정만</option>
                    <option value="series">반복 전체</option>
                  </select>
                </label>
              )}

            </div>
            <div className="save-bar">
              <button
                type="button"
                className="secondary"
                onClick={() => close()}
              >
                취소
              </button>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? "저장 중…" : "저장"}
              </button>
            </div>
            {editing && draft.repeat !== "none" && (
              <button
                type="button"
                className="text-button danger"
                onClick={async () => {
                  if (!(await ask("이 반복 일정 전체를 삭제할까요?"))) return;
                  const e = events.find((x) => x.id === editing.baseId)!;
                  try {
                    if (demo)
                      persistLocal(
                        deleteLocalEvent(
                          JSON.parse(
                            localStorage.getItem(BASEKEY + user!.id) ?? "[]",
                          ),
                          e.id,
                          e.revision,
                        ),
                      );
                    else {
                      await api("/api/events", "DELETE", {
                        id: e.id,
                        revision: e.revision,
                      },e.accountId||user!.id);
                      await load();
                    }
                    close(true);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                반복 전체 삭제
              </button>
            )}
          </form>
        )}

      </dialog>
      <dialog ref={filterDialog} className="sheet account-filter-dialog" aria-label="계정 필터" onCancel={e=>{e.preventDefault();setFilterOpen(false)}}><div className="sheet-head"><h2>계정 필터</h2><button aria-label="계정 필터 닫기" onClick={()=>setFilterOpen(false)}><X/></button></div>{accountFilters()}<button className="primary" onClick={()=>setFilterOpen(false)}>적용</button></dialog>
      {authSheet()}
      {confirmationSheet()}
    </main>
  );
}
