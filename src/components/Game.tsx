import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Tables } from "@/integrations/supabase/types";
import {
  LOCATIONS, ROAD_LINKS, FACULTIES, LEVELS, HOSTELS, TRANSPORT, FOODS, CANDIDATES, CBT_QUESTIONS,
  RANDOM_EVENTS, dist, type Loc, type Transport,
} from "@/lib/game";

type Profile = Tables<"profiles">;
type Msg = Tables<"messages">;
interface Stats { energy: number; hunger: number; sanity: number; cgpa: number; money: number; attendance: number }
interface Save {
  stats: Stats; loc: string; day: number; hour: number;
  log: string[]; roomDecor: string[]; roommates: string[];
}

const DEFAULT: Save = {
  stats: { energy: 80, hunger: 70, sanity: 75, cgpa: 3.5, money: 15000, attendance: 0 },
  loc: "gate", day: 1, hour: 8, log: ["Welcome to UNILAG. Find your feet!"], roommates: [], roomDecor: [],
};
const KEY = "unilaglife-save-v2";
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export function Game() {
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null | undefined>(undefined);
  const [me, setMe] = useState<Profile | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setMe(session === null ? null : undefined); return; }
    supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle().then(({ data }) => setMe(data));
  }, [session]);
  if (session === undefined || (session && me === undefined)) return <div className="min-h-screen" />;
  if (!session) return <AuthScreen />;
  if (!me) return <Onboarding userId={session.user.id} email={session.user.email ?? ""} onDone={setMe} />;
  return <GameInner me={me} />;
}

function GameInner({ me }: { me: Profile }) {
  const [s, setS] = useState<Save>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"place" | "board" | "politics" | "room" | "inbox">("place");
  const inbox = useInbox(me.id);
  const [travelTo, setTravelTo] = useState<Loc | null>(null);
  const [event, setEvent] = useState<(typeof RANDOM_EVENTS)[number] | null>(null);
  const [cbt, setCbt] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS({ ...DEFAULT, ...JSON.parse(raw) }); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(s)); }, [s, loaded]);

  const here = LOCATIONS.find((l) => l.id === s.loc)!;

  function act(msg: string, fx: Partial<Stats> = {}, hours = 1) {
    setS((p) => {
      let hour = p.hour + hours, day = p.day;
      while (hour >= 24) { hour -= 24; day++; }
      const st = { ...p.stats };
      st.hunger = clamp(st.hunger - hours * 3 + (fx.hunger ?? 0));
      st.energy = clamp(st.energy + (fx.energy ?? 0));
      st.sanity = clamp(st.sanity + (fx.sanity ?? 0) - (st.hunger < 20 ? 3 : 0));
      st.cgpa = clamp(+(st.cgpa + (fx.cgpa ?? 0)).toFixed(2), 0, 5);
      st.money = Math.max(0, st.money + (fx.money ?? 0));
      st.attendance = st.attendance + (fx.attendance ?? 0);
      return { ...p, stats: st, hour, day, log: [`D${day} ${String(hour).padStart(2, "0")}:00 — ${msg}`, ...p.log].slice(0, 40) };
    });
    if (Math.random() < 0.12) setEvent(RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]!);
  }

  function travel(mode: Transport) {
    if (!travelTo) return;
    const t = TRANSPORT[mode];
    if (s.stats.money < t.fare) return alert("Not enough money for the fare.");
    const d = dist(here, travelTo) / 100;
    const hrs = Math.max(1, Math.round(d / t.speed));
    act(`${t.label} to ${travelTo.name}`, { energy: -Math.round(d * t.energyPer), money: -t.fare }, hrs);
    setS((p) => ({ ...p, loc: travelTo.id }));
    setTravelTo(null); setTab("place");
  }

  if (!loaded) return <div className="min-h-screen" />;

  const st = s.stats;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-extrabold text-primary">unilaglife<span className="text-foreground">.app</span></h1>
          <span className="font-mono text-xs text-muted-foreground">Day {s.day} · {String(s.hour).padStart(2, "0")}:00 · {here.name}</span>
        </div>
        <div className="flex items-center gap-2"><Radio /><button onClick={() => supabase.auth.signOut()} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">Sign out</button></div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <StatBar st={st} profile={me} />
          <CampusMap current={s.loc} onPick={(l) => l.id !== s.loc && setTravelTo(l)} />
          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="mb-2 font-mono text-xs uppercase text-muted-foreground">Campus log</h3>
            <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs">{s.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card">
          <nav className="grid grid-cols-5 border-b border-border text-xs">
            {([["place", "Here"], ["inbox", `Inbox${inbox.unread ? ` (${inbox.unread})` : ""}`], ["room", "My Room"], ["board", "Board"], ["politics", "Elections"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-2 py-3 font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</button>
            ))}
          </nav>
          <div className="p-4">
            {tab === "place" && <Place loc={here} s={s} me={me} act={act} setS={setS} startCbt={() => setCbt(true)} />}
            {tab === "inbox" && <Inbox me={me} inbox={inbox} act={act} />}
            {tab === "room" && <MyRoom s={s} me={me} setS={setS} act={act} />}
            {tab === "board" && <Board me={me} />}
            {tab === "politics" && <Politics me={me} onVote={(office) => act(`Voted in the ${office} election`, { sanity: 3 }, 0)} />}
          </div>
        </aside>
      </div>

      {travelTo && (
        <Modal onClose={() => setTravelTo(null)} title={`Go to ${travelTo.name}`}>
          <p className="mb-3 text-sm text-muted-foreground">{travelTo.blurb}</p>
          <div className="grid gap-2">
            {(Object.keys(TRANSPORT) as Transport[]).map((m) => {
              const t = TRANSPORT[m]; const d = dist(here, travelTo) / 100;
              return (
                <button key={m} onClick={() => travel(m)} className="flex justify-between rounded-md border border-border p-3 text-left hover:border-primary">
                  <span className="font-semibold">{t.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{Math.max(1, Math.round(d / t.speed))}h · −{Math.round(d * t.energyPer)} energy · ₦{t.fare}</span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {event && (
        <Modal title={event.title} onClose={() => { act(event.title, event.fx as Partial<Stats>, 0); setEvent(null); }}>
          <p className="text-sm">{event.text}</p>
          <button className="mt-4 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={() => { act(event.title, event.fx as Partial<Stats>, 0); setEvent(null); }}>Okay o</button>
        </Modal>
      )}
      {cbt && <Cbt onDone={(score) => { setCbt(false); act(`CBT exam: ${score}/5`, { cgpa: (score - 2.5) * 0.06, sanity: score >= 3 ? 5 : -10, energy: -10 }, 2); }} />}
    </div>
  );
}

function StatBar({ st, profile }: { st: Stats; profile: Profile }) {
  const bars: [string, number][] = [["Energy", st.energy], ["Hunger", st.hunger], ["Sanity", st.sanity]];
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[auto_1fr_auto]">
      <div>
        <div className="font-semibold">{profile.name}</div>
        <div className="text-xs text-muted-foreground">{profile.level} · {profile.dept}, {profile.faculty} · {profile.residence}</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {bars.map(([n, v]) => (
          <div key={n}>
            <div className="flex justify-between font-mono text-[10px] uppercase text-muted-foreground"><span>{n}</span><span>{v}</span></div>
            <div className="h-2 rounded bg-muted"><div className={`h-2 rounded ${v < 25 ? "bg-destructive" : "bg-accent"}`} style={{ width: `${v}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 font-mono text-sm">
        <div><div className="text-[10px] text-muted-foreground">CGPA</div><b className="text-primary">{st.cgpa.toFixed(2)}</b></div>
        <div><div className="text-[10px] text-muted-foreground">WALLET</div><b>₦{st.money.toLocaleString()}</b></div>
      </div>
    </div>
  );
}

const ICON: Record<string, string> = { gate: "🚧", admin: "🏛️", food: "🍲", library: "📚", faculty: "🎓", hostel: "🛏️", sports: "⚽", lagoon: "🌊", offcampus: "🏘️", business: "🏪", road: "🛺" };

function CampusMap({ current, onPick }: { current: string; onPick: (l: Loc) => void }) {
  const byId = useMemo(() => Object.fromEntries(LOCATIONS.map((l) => [l.id, l])) as Record<string, Loc>, []);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <svg viewBox="0 0 1000 720" className="block w-full bg-map-land">
        <path d="M860 0 C 1000 0 1000 0 1000 0 L1000 720 L960 720 C 900 560 1000 420 880 300 C 840 200 900 100 860 0 Z" className="fill-map-water" />
        <text x="955" y="420" className="fill-foreground/60 font-mono text-[14px]" transform="rotate(90 955 420)">LAGOS LAGOON</text>
        <rect x="0" y="0" width="150" height="720" className="fill-muted/60" />
        <text x="20" y="30" className="fill-muted-foreground font-mono text-[12px]">OFF-CAMPUS</text>
        {ROAD_LINKS.map(([a, b], i) => (
          <line key={i} x1={byId[a]!.x} y1={byId[a]!.y} x2={byId[b]!.x} y2={byId[b]!.y} className="stroke-map-road" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        ))}
        {LOCATIONS.map((l) => (
          <g key={l.id} onClick={() => onPick(l)} className="cursor-pointer">
            <circle cx={l.x} cy={l.y} r={l.id === current ? 26 : 20} className={l.id === current ? "fill-primary" : "fill-card stroke-primary hover:fill-secondary"} strokeWidth={2} />
            <text x={l.x} y={l.y + 6} textAnchor="middle" className="text-[18px] select-none">{ICON[l.type]}</text>
            <text x={l.x} y={l.y + 42} textAnchor="middle" className="fill-foreground text-[13px] font-semibold select-none">{l.name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

type ActFn = (msg: string, fx?: Partial<Stats>, hours?: number) => void;
const Btn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:border-primary hover:bg-muted">{children}</button>
);

function Place({ loc, s, me, act, setS, startCbt }: { loc: Loc; s: Save; me: Profile; act: ActFn; setS: React.Dispatch<React.SetStateAction<Save>>; startCbt: () => void }) {
  const [hall, setHall] = useState<string | null>(null);
  const pay = (n: number, msg: string, fx: Partial<Stats>, h = 1) => (s.stats.money < n ? alert("Your wallet is dry.") : act(msg, { ...fx, money: -n }, h));
  const hallName = loc.type === "hostel" ? loc.name : loc.id === "akoka" ? "Off-Campus (Akoka)" : loc.id === "abuleoja" ? "Off-Campus (Abule-Oja)" : null;
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-bold">{ICON[loc.type]} {loc.name}</h2>
        <p className="text-sm text-muted-foreground">{loc.blurb}</p>
      </div>
      <div className="space-y-2">
        {loc.type === "food" && FOODS.map((f) => <Btn key={f.name} onClick={() => pay(f.price, `Ate ${f.name}`, { hunger: f.hunger, sanity: f.sanity })}>{f.name} <span className="float-right font-mono text-xs">₦{f.price}</span></Btn>)}
        {loc.type === "faculty" && <>
          <Btn onClick={() => act("Attended lecture front row", { cgpa: 0.02, energy: -10, attendance: 1 }, 2)}>Attend lecture (front row)</Btn>
          <Btn onClick={() => act("Signed attendance and slipped out", { cgpa: 0.005, sanity: 3, attendance: 1 }, 1)}>Sign attendance & dodge</Btn>
          <Btn onClick={() => act("Skipped class to gist", { cgpa: -0.02, sanity: 6 }, 1)}>Skip and gist outside</Btn>
          <Btn onClick={startCbt}>Write CBT exam ⏱️</Btn>
        </>}
        {loc.type === "library" && <>
          <Btn onClick={() => act("Read quietly", { cgpa: 0.03, energy: -12, sanity: -2 }, 3)}>Read for 3 hours</Btn>
          {loc.id === "tdb" && <Btn onClick={() => act("TDB night reading till day break", { cgpa: 0.08, energy: -35, sanity: -8 }, 8)}>TDB night reading 🌙</Btn>}
        </>}
        {loc.type === "business" && <>
          <Btn onClick={() => act("Withdrew cash at POS (₦100 charge)", { money: 4900 }, 0)}>POS: withdraw ₦5,000 from home allowance</Btn>
          <Btn onClick={() => pay(500, "Browsed at cybercafe & did course registration", { sanity: 2 })}>Cybercafe — ₦500</Btn>
          <Btn onClick={() => pay(800, "Printed assignment", { cgpa: 0.01 })}>Print shop — ₦800</Btn>
          <Btn onClick={() => pay(3000, "Got a fresh look at the salon", { sanity: 15 }, 2)}>Hair salon — ₦3,000</Btn>
          <Btn onClick={() => act("Did a gig: typed a project for someone", { money: 2500, energy: -15 }, 3)}>Hustle a typing gig (+₦2,500)</Btn>
        </>}
        {loc.type === "sports" && <>
          <Btn onClick={() => act("Played football", { energy: -20, sanity: 15, hunger: -10 }, 2)}>Play football</Btn>
          <Btn onClick={() => act("Jogged the track", { energy: -15, sanity: 10 }, 1)}>Jog the track</Btn>
        </>}
        {loc.type === "lagoon" && <Btn onClick={() => act("Chilled at Lagoon Front", { sanity: 20, energy: 5 }, 2)}>Watch the sunset 🌅</Btn>}
        {loc.type === "gate" && <Btn onClick={() => act("Passed security check", { sanity: -1 }, 0)}>Show ID card to security</Btn>}
        {loc.type === "admin" && <Btn onClick={() => act("Chased signatures at Senate", { energy: -10, sanity: -8 }, 3)}>Process documents at admin</Btn>}
        {loc.type === "offcampus" && <>
          <Btn onClick={() => pay(600, "Ate at a local buka", { hunger: 35 })}>Cheap buka — ₦600</Btn>
          <Btn onClick={() => act("Slept off-campus", { energy: 60 }, 8)}>Sleep (if you live here)</Btn>
        </>}
        {loc.type === "road" && <Btn onClick={() => act("People-watched on University Road", { sanity: 4 }, 1)}>Hang out by the shuttle park</Btn>}
        {hallName && <>
          {loc.type === "hostel" && <Btn onClick={() => act(`Slept at ${loc.name}`, { energy: 60, sanity: 5 }, 8)}>Sleep 8 hours</Btn>}
          <Btn onClick={() => setHall(hall ? null : hallName)}>{hall ? "Hide residents" : "Explore rooms & students"}</Btn>
        </>}
      </div>
      {hall && <HallRooms hall={hall} me={me} act={act} />}
    </div>
  );
}

async function send(from: string, to: string, kind: "knock" | "note" | "invite" | "game", body = "") {
  const { error } = await supabase.from("messages").insert({ from_id: from, to_id: to, kind, body });
  if (error) alert(error.message);
}

function HallRooms({ hall, me, act }: { hall: string; me: Profile; act: ActFn }) {
  const [people, setPeople] = useState<Profile[] | null>(null);
  const [note, setNote] = useState<{ to: Profile; text: string } | null>(null);
  const [game, setGame] = useState<Profile | null>(null);
  useEffect(() => {
    supabase.from("profiles").select("*").eq("residence", hall).order("room").then(({ data }) => setPeople(data ?? []));
  }, [hall]);
  const rooms = useMemo(() => {
    const m = new Map<string, Profile[]>();
    (people ?? []).forEach((p) => { const k = p.room || "Off-campus lodge"; m.set(k, [...(m.get(k) ?? []), p]); });
    return [...m.entries()];
  }, [people]);
  const online = (p: Profile) => p.is_seed ? (p.name.length % 3 !== 0) : Date.now() - new Date(p.last_seen).getTime() < 10 * 60_000;
  if (!people) return <p className="text-sm text-muted-foreground">Loading residents…</p>;
  if (!people.length) return <p className="text-sm text-muted-foreground">No one has registered here yet. Invite your hallmates!</p>;
  return (
    <div className="space-y-2">
      {rooms.map(([room, occ]) => (
        <div key={room} className="rounded-md border border-border p-2">
          <div className="mb-1 flex justify-between font-mono text-xs"><b>{room.startsWith("Off") ? room : `Room ${room}`}</b><span className="text-muted-foreground">{occ.length} resident{occ.length > 1 ? "s" : ""}</span></div>
          {occ.map((o) => {
            const isMe = o.id === me.id; const home = online(o);
            return (
              <div key={o.id} className="py-1 text-sm">
                <div><span className={home ? "text-accent" : "text-muted-foreground"}>●</span> {o.name}{isMe && " (you)"} <span className="text-xs text-muted-foreground">{o.level} {o.dept}</span></div>
                {o.bio && <div className="pl-4 text-xs italic text-muted-foreground">"{o.bio}"</div>}
                {!isMe && <div className="mt-1 flex flex-wrap gap-1 pl-4 text-xs">
                  <button className="rounded bg-muted px-2 py-1 hover:bg-secondary" onClick={async () => { await send(me.id, o.id, "knock"); act(home ? `Knocked — ${o.name} let you in for gist` : `Knocked on ${o.name}'s door, left a knock`, { sanity: home ? 6 : 1 }, 1); }}>✊ Knock</button>
                  <button className="rounded bg-muted px-2 py-1 hover:bg-secondary" onClick={() => setNote({ to: o, text: "" })}>✉️ Note</button>
                  <button className="rounded bg-muted px-2 py-1 hover:bg-secondary" onClick={async () => { await send(me.id, o.id, "invite", "Come squat with me!"); act(`Invited ${o.name} to squat`, { sanity: 2 }, 0); }}>🛏️ Squat invite</button>
                  <button className="rounded bg-primary px-2 py-1 text-primary-foreground" onClick={() => setGame(o)}>🎲 Play trivia</button>
                </div>}
              </div>
            );
          })}
        </div>
      ))}
      {note && (
        <Modal title={`Note to ${note.to.name}`} onClose={() => setNote(null)}>
          <textarea maxLength={500} className="h-24 w-full rounded-md border border-input bg-background p-2 text-sm" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} placeholder="Slide it under the door…" />
          <button className="mt-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={async () => { if (!note.text.trim()) return; await send(me.id, note.to.id, "note", note.text.trim()); act(`Slid a note to ${note.to.name}`, { sanity: 2 }, 0); setNote(null); }}>Send note</button>
        </Modal>
      )}
      {game && <Trivia host={game} me={me} onDone={(score) => { act(`Played UNILAG trivia with ${game.name}: ${score}/5`, { sanity: 8 + score, energy: -5 }, 1); setGame(null); }} />}
    </div>
  );
}

function Trivia({ host, me, onDone }: { host: Profile; me: Profile; onDone: (score: number) => void }) {
  const qs = useMemo(() => [...CBT_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5), []);
  const [i, setI] = useState(0); const [score, setScore] = useState(0);
  const [board, setBoard] = useState<{ name: string; score: number }[]>([]);
  const finished = i >= qs.length;
  useEffect(() => {
    if (!finished) return;
    (async () => {
      await supabase.from("trivia_scores").insert({ player_id: me.id, host_id: host.id, score });
      await send(me.id, host.id, "game", `Scored ${score}/5 at UNILAG trivia in your room!`);
      const { data } = await supabase.from("trivia_scores").select("score, profiles!trivia_scores_player_id_fkey(name)").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(5);
      setBoard((data ?? []).map((r) => ({ name: (r.profiles as { name: string } | null)?.name ?? "?", score: r.score })));
    })();
  }, [finished]); // eslint-disable-line
  return (
    <Modal title={`Trivia in ${host.name.split(" ")[0]}'s room`} onClose={() => onDone(score)}>
      {!finished ? <>
        <div className="mb-2 font-mono text-xs text-muted-foreground">Question {i + 1}/5 · Score {score}</div>
        <p className="mb-3 font-semibold">{qs[i]!.q}</p>
        <div className="grid grid-cols-2 gap-2">
          {qs[i]!.a.map((a, k) => <button key={a} onClick={() => { if (k === qs[i]!.c) setScore((x) => x + 1); setI((x) => x + 1); }} className="rounded-md border border-border p-3 hover:border-primary">{a}</button>)}
        </div>
      </> : <>
        <p className="mb-3 text-lg">You scored <b className="text-primary">{score}/5</b>!</p>
        <div className="font-mono text-xs uppercase text-muted-foreground">Campus leaderboard</div>
        {board.map((b, k) => <div key={k} className="flex justify-between text-sm"><span>{k + 1}. {b.name}</span><b>{b.score}</b></div>)}
        <button className="mt-4 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={() => onDone(score)}>Done</button>
      </>}
    </Modal>
  );
}

function useInbox(myId: string) {
  const [msgs, setMsgs] = useState<(Msg & { from?: { name: string } | null; to?: { name: string } | null })[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("messages")
      .select("*, from:profiles!messages_from_id_fkey(name), to:profiles!messages_to_id_fkey(name)")
      .order("created_at", { ascending: false }).limit(50);
    setMsgs((data as never) ?? []);
  }, []);
  useEffect(() => {
    load();
    supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", myId).then(() => {});
    const ch = supabase.channel(`inbox-${myId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, load]);
  const unread = msgs.filter((m) => m.to_id === myId && !m.read).length;
  return { msgs, unread, load };
}

const KIND: Record<string, string> = { knock: "✊ knocked on your door", note: "✉️ slid a note", invite: "🛏️ invited you to squat", game: "🎲 played trivia" };
function Inbox({ me, inbox, act }: { me: Profile; inbox: ReturnType<typeof useInbox>; act: ActFn }) {
  const [reply, setReply] = useState<{ id: string; name: string; text: string } | null>(null);
  useEffect(() => {
    const ids = inbox.msgs.filter((m) => m.to_id === me.id && !m.read).map((m) => m.id);
    if (ids.length) supabase.from("messages").update({ read: true }).in("id", ids).then(() => inbox.load());
  }, [inbox.msgs.length]); // eslint-disable-line
  return (
    <div className="space-y-2">
      <h2 className="font-display text-xl font-bold">📬 Knocks & Notes</h2>
      {!inbox.msgs.length && <p className="text-sm text-muted-foreground">Nothing yet. Visit a hostel and knock on some doors!</p>}
      {inbox.msgs.map((m) => {
        const incoming = m.to_id === me.id;
        return (
          <div key={m.id} className={`rounded-md border p-2 text-sm ${incoming && !m.read ? "border-primary" : "border-border"}`}>
            <div>{incoming ? <b>{m.from?.name}</b> : <>You → <b>{m.to?.name}</b></>} <span className="text-muted-foreground">{incoming ? KIND[m.kind] : `(${m.kind})`}</span></div>
            {m.body && <p className="mt-1">{m.body}</p>}
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{new Date(m.created_at).toLocaleString()}</span>
              {incoming && <button className="text-primary" onClick={() => setReply({ id: m.from_id, name: m.from?.name ?? "", text: "" })}>Reply</button>}
            </div>
          </div>
        );
      })}
      {reply && (
        <Modal title={`Reply to ${reply.name}`} onClose={() => setReply(null)}>
          <textarea maxLength={500} className="h-24 w-full rounded-md border border-input bg-background p-2 text-sm" value={reply.text} onChange={(e) => setReply({ ...reply, text: e.target.value })} />
          <button className="mt-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={async () => { if (!reply.text.trim()) return; await send(me.id, reply.id, "note", reply.text.trim()); act(`Replied to ${reply.name}`, {}, 0); setReply(null); }}>Send</button>
        </Modal>
      )}
    </div>
  );
}

const DECOR = ["🛏️ Fresh bedsheet", "💡 Rechargeable lamp", "🪞 Mirror", "🖼️ Afrobeats poster", "🧺 Bucket & kettle", "🔌 Extension box", "🪴 Small plant", "📦 Provisions box"];
function MyRoom({ s, me, setS, act }: { s: Save; me: Profile; setS: React.Dispatch<React.SetStateAction<Save>>; act: ActFn }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold">{me.residence}{me.room && ` · ${me.room}`}</h2>
      <div className="rounded-md border border-dashed border-primary p-3">
        <div className="mb-2 font-mono text-xs text-muted-foreground">Your bunk space</div>
        <div className="flex min-h-12 flex-wrap gap-2 text-sm">{s.roomDecor.length ? s.roomDecor.map((d) => <span key={d} className="rounded bg-muted px-2 py-1">{d}</span>) : "Empty bunk. Make it home."}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DECOR.filter((d) => !s.roomDecor.includes(d)).map((d) => (
          <Btn key={d} onClick={() => { if (s.stats.money < 1000) return alert("Need ₦1,000"); setS((p) => ({ ...p, roomDecor: [...p.roomDecor, d] })); act(`Bought ${d}`, { money: -1000, sanity: 4 }, 0); }}>{d} <span className="font-mono text-xs">₦1k</span></Btn>
        ))}
      </div>
      <div>
        <div className="font-mono text-xs uppercase text-muted-foreground">Squatters / roommates</div>
        <p className="text-sm text-muted-foreground">Send squat invites from the hostel rooms list — replies land in your Inbox.</p>
      </div>
    </div>
  );
}

function Board({ me }: { me: Profile }) {
  const [t, setT] = useState(""); const [b, setB] = useState("");
  const [posts, setPosts] = useState<{ id: string; title: string; body: string; author_id: string; profiles: { name: string } | null }[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("posts").select("id, title, body, author_id, profiles(name)").order("created_at", { ascending: false }).limit(50);
    setPosts((data as never) ?? []);
  }, []);
  useEffect(() => {
    load();
    const ch = supabase.channel("posts").on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold">📌 Campus Noticeboard</h2>
      <div className="space-y-2 rounded-md bg-muted p-2">
        <input maxLength={120} className="w-full rounded border border-input bg-background p-2 text-sm" placeholder="Gig / business title" value={t} onChange={(e) => setT(e.target.value)} />
        <textarea maxLength={1000} className="w-full rounded border border-input bg-background p-2 text-sm" placeholder="Details, location, price…" value={b} onChange={(e) => setB(e.target.value)} />
        <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground" onClick={async () => { if (!t.trim()) return; const { error } = await supabase.from("posts").insert({ author_id: me.id, title: t.trim(), body: b.trim() }); if (error) return alert(error.message); setT(""); setB(""); }}>Pin it</button>
      </div>
      {posts.map((p) => (
        <div key={p.id} className="rotate-[-0.5deg] rounded-md border-l-4 border-primary bg-secondary p-3 even:rotate-[0.5deg]">
          <div className="font-semibold">{p.title}</div><p className="text-sm">{p.body}</p>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>— {p.profiles?.name}</span>
            {p.author_id === me.id && <button className="text-destructive" onClick={() => supabase.from("posts").delete().eq("id", p.id)}>Remove</button>}</div>
        </div>
      ))}
    </div>
  );
}

function Politics({ me, onVote }: { me: Profile; onVote: (office: string) => void }) {
  const offices = [...new Set(CANDIDATES.map((c) => c.office))];
  const [votes, setVotes] = useState<{ voter_id: string; office: string; candidate_id: string }[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("votes").select("voter_id, office, candidate_id");
    setVotes(data ?? []);
  }, []);
  useEffect(() => {
    load();
    const ch = supabase.channel("votes").on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);
  const mine = (o: string) => votes.find((v) => v.voter_id === me.id && v.office === o)?.candidate_id;
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">🗳️ SUG & Hall Elections</h2>
      {offices.map((o) => {
        const total = votes.filter((v) => v.office === o).length || 1;
        return (
          <div key={o} className="space-y-2">
            <div className="font-mono text-xs uppercase text-muted-foreground">{o} · {votes.filter((v) => v.office === o).length} votes</div>
            {CANDIDATES.filter((c) => c.office === o).map((c) => {
              const n = votes.filter((v) => v.candidate_id === c.id).length; const pct = Math.round((n / total) * 100);
              return (
                <div key={c.id} className={`rounded-md border p-3 ${mine(o) === c.id ? "border-primary" : "border-border"}`}>
                  <div className="flex justify-between"><span className="font-semibold">{c.name}</span><span className="font-mono text-xs">{n} · {pct}%</span></div>
                  <div className="my-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${pct}%` }} /></div>
                  <p className="text-sm text-muted-foreground">{c.manifesto}</p>
                  <button disabled={!!mine(o)} onClick={async () => { const { error } = await supabase.from("votes").insert({ voter_id: me.id, office: o, candidate_id: c.id }); if (error) return alert(error.message); onVote(o); }} className="mt-2 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40">{mine(o) === c.id ? "Your vote ✓" : "Vote"}</button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Cbt({ onDone }: { onDone: (score: number) => void }) {
  const qs = useMemo(() => [...CBT_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5), []);
  const [i, setI] = useState(0); const [score, setScore] = useState(0); const [time, setTime] = useState(60);
  useEffect(() => { const t = setInterval(() => setTime((x) => x - 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (time <= 0 || i >= qs.length) onDone(score); }, [time, i]); // eslint-disable-line
  if (i >= qs.length) return null;
  const q = qs[i]!;
  return (
    <Modal title={`CBT Exam — Q${i + 1}/5`} onClose={() => onDone(score)}>
      <div className="mb-3 font-mono text-sm text-primary">⏱️ {time}s left</div>
      <p className="mb-3 font-semibold">{q.q}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.a.map((a, k) => <button key={a} onClick={() => { if (k === q.c) setScore((x) => x + 1); setI((x) => x + 1); }} className="rounded-md border border-border p-3 hover:border-primary">{a}</button>)}
      </div>
    </Modal>
  );
}

function Radio() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${on ? "animate-pulse bg-destructive" : "bg-muted-foreground"}`} />
      <span className="font-mono">UNILAG 103.1 FM</span>
      <button onClick={() => setOn(!on)} className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">{on ? "Stop" : "Listen"}</button>
      {on && <audio autoPlay src="https://stream.zeno.fm/unilagfm" onError={() => { alert("The radio stream couldn't load right now."); setOn(false); }} />}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex justify-between"><h3 className="font-display text-lg font-bold">{title}</h3><button onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [msg, setMsg] = useState("");
  const inp = "w-full rounded-md border border-input bg-background p-2.5 text-sm";
  async function submit() {
    setMsg("");
    const { error, data } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
    if (error) return setMsg(error.message);
    if (mode === "up" && !data.session) setMsg("Check your email to confirm your account, then sign in.");
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-5xl font-extrabold text-primary">unilaglife<span className="text-foreground">.app</span></h1>
        <p className="mb-6 mt-2 text-muted-foreground">Live the Akoka experience with real students — hostels, New Hall, SUG wahala, trivia and TDB nights.</p>
        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <button onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })} className="w-full rounded-md border border-border py-2.5 font-semibold hover:bg-muted">Continue with Google</button>
          <div className="text-center font-mono text-xs text-muted-foreground">or</div>
          <input className={inp} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inp} type="password" placeholder="Password (min 6)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button onClick={submit} className="w-full rounded-md bg-primary py-2.5 font-semibold text-primary-foreground">{mode === "in" ? "Sign in" : "Create account"}</button>
          {msg && <p className="text-sm text-primary">{msg}</p>}
          <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground underline">{mode === "in" ? "New student? Create an account" : "Have an account? Sign in"}</button>
        </div>
      </div>
    </div>
  );
}

function Onboarding({ userId, email, onDone }: { userId: string; email: string; onDone: (p: Profile) => void }) {
  const [p, setP] = useState({ name: "", matric: "", faculty: "Science", dept: "", level: "100L", residence: "Jaja Hall", room: "", bio: "" });
  const [err, setErr] = useState("");
  const f = (k: keyof typeof p) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setP({ ...p, [k]: e.target.value });
  const inp = "w-full rounded-md border border-input bg-background p-2.5 text-sm";
  const isStudentEmail = /@(live\.)?unilag\.edu\.ng$/i.test(email);
  async function save() {
    if (!/^\d{9}$/.test(p.matric)) return setErr("Matric number must be 9 digits.");
    const { matric: _m, ...rest } = p;
    const { data, error } = await supabase.from("profiles").insert({ ...rest, room: rest.residence.startsWith("Off") ? "" : rest.room, user_id: userId }).select().single();
    if (error) return setErr(error.message);
    onDone(data);
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <h1 className="font-display text-4xl font-extrabold text-primary">Student registration</h1>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">{isStudentEmail ? "✓ UNILAG student email detected." : "Tip: sign up with your @live.unilag.edu.ng email to get a verified badge later."}</p>
        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <input className={inp} placeholder="Full name" value={p.name} onChange={f("name")} />
          <input className={inp} placeholder="Matric number (9 digits, kept private)" value={p.matric} onChange={f("matric")} />
          <select className={inp} value={p.faculty} onChange={f("faculty")}>{FACULTIES.map((x) => <option key={x}>{x}</option>)}</select>
          <input className={inp} placeholder="Department" value={p.dept} onChange={f("dept")} />
          <select className={inp} value={p.level} onChange={f("level")}>{LEVELS.map((x) => <option key={x}>{x}</option>)}</select>
          <select className={inp} value={p.residence} onChange={f("residence")}>{[...HOSTELS.map((h) => `${h} Hall`), "Off-Campus (Akoka)", "Off-Campus (Abule-Oja)"].map((x) => <option key={x}>{x}</option>)}</select>
          {!p.residence.startsWith("Off") && <input className={inp} placeholder="Room (e.g. B214)" value={p.room} onChange={f("room")} />}
          <input className={inp} maxLength={140} placeholder="Short bio (what's your hustle?)" value={p.bio} onChange={f("bio")} />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button disabled={!p.name || !p.dept} onClick={save} className="w-full rounded-md bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-40">Enter campus</button>
        </div>
      </div>
    </div>
  );
}
