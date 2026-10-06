import { useEffect, useMemo, useState } from "react";
import {
  LOCATIONS, ROAD_LINKS, FACULTIES, LEVELS, HOSTELS, TRANSPORT, FOODS, CANDIDATES, CBT_QUESTIONS,
  RANDOM_EVENTS, roomsFor, dist, type Loc, type Transport,
} from "@/lib/game";

interface Profile { name: string; email: string; matric: string; faculty: string; dept: string; level: string; residence: string; room: string }
interface Stats { energy: number; hunger: number; sanity: number; cgpa: number; money: number; attendance: number }
interface Post { id: number; author: string; title: string; body: string }
interface Save {
  profile: Profile | null; stats: Stats; loc: string; day: number; hour: number;
  log: string[]; votes: Record<string, string>; posts: Post[]; roomDecor: string[]; roommates: string[];
}

const DEFAULT: Save = {
  profile: null,
  stats: { energy: 80, hunger: 70, sanity: 75, cgpa: 3.5, money: 15000, attendance: 0 },
  loc: "gate", day: 1, hour: 8, log: ["Welcome to UNILAG. Find your feet!"], votes: {}, roommates: [], roomDecor: [],
  posts: [
    { id: 1, author: "Tobi Prints", title: "Cheap printing & binding", body: "₦20/page at the Business Strip. Projects bound in 1 hour." },
    { id: 2, author: "Amaka Braids", title: "Knotless braids — student price", body: "Moremi Hall B214. DM for slots this weekend." },
    { id: 3, author: "Jaja Hall Week", title: "Hall Week Concert Friday", body: "Live at Jaja. Bring your naira for spraying!" },
  ],
};
const KEY = "unilaglife-save-v1";
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export function Game() {
  const [s, setS] = useState<Save>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"place" | "board" | "politics" | "room">("place");
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
    if (Math.random() < 0.12) setEvent(RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]);
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
  if (!s.profile) return <Onboarding onDone={(profile) => setS((p) => ({ ...p, profile }))} />;

  const st = s.stats;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-extrabold text-primary">unilaglife<span className="text-foreground">.app</span></h1>
          <span className="font-mono text-xs text-muted-foreground">Day {s.day} · {String(s.hour).padStart(2, "0")}:00 · {here.name}</span>
        </div>
        <Radio />
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <StatBar st={st} profile={s.profile} />
          <CampusMap current={s.loc} onPick={(l) => l.id !== s.loc && setTravelTo(l)} />
          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="mb-2 font-mono text-xs uppercase text-muted-foreground">Campus log</h3>
            <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs">{s.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card">
          <nav className="grid grid-cols-4 border-b border-border text-xs">
            {([["place", "Here"], ["room", "My Room"], ["board", "Noticeboard"], ["politics", "Elections"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-2 py-3 font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</button>
            ))}
          </nav>
          <div className="p-4">
            {tab === "place" && <Place loc={here} s={s} act={act} setS={setS} startCbt={() => setCbt(true)} />}
            {tab === "room" && <MyRoom s={s} setS={setS} act={act} />}
            {tab === "board" && <Board posts={s.posts} author={s.profile.name} add={(p) => setS((x) => ({ ...x, posts: [p, ...x.posts] }))} />}
            {tab === "politics" && <Politics votes={s.votes} vote={(office, id) => { setS((x) => ({ ...x, votes: { ...x.votes, [office]: id } })); act(`Voted in the ${office} election`, { sanity: 3 }, 0); }} />}
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
  const byId = useMemo(() => Object.fromEntries(LOCATIONS.map((l) => [l.id, l])), []);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <svg viewBox="0 0 1000 720" className="block w-full bg-map-land">
        <path d="M860 0 C 1000 0 1000 0 1000 0 L1000 720 L960 720 C 900 560 1000 420 880 300 C 840 200 900 100 860 0 Z" className="fill-map-water" />
        <text x="955" y="420" className="fill-foreground/60 font-mono text-[14px]" transform="rotate(90 955 420)">LAGOS LAGOON</text>
        <rect x="0" y="0" width="150" height="720" className="fill-muted/60" />
        <text x="20" y="30" className="fill-muted-foreground font-mono text-[12px]">OFF-CAMPUS</text>
        {ROAD_LINKS.map(([a, b], i) => (
          <line key={i} x1={byId[a].x} y1={byId[a].y} x2={byId[b].x} y2={byId[b].y} className="stroke-map-road" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
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

function Place({ loc, s, act, setS, startCbt }: { loc: Loc; s: Save; act: ActFn; setS: React.Dispatch<React.SetStateAction<Save>>; startCbt: () => void }) {
  const [hall, setHall] = useState<string | null>(null);
  const pay = (n: number, msg: string, fx: Partial<Stats>, h = 1) => (s.stats.money < n ? alert("Your wallet is dry.") : act(msg, { ...fx, money: -n }, h));
  const hallName = loc.type === "hostel" ? loc.name.replace(" Hall", "") : null;
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
          <Btn onClick={() => act(`Slept at ${loc.name}`, { energy: 60, sanity: 5 }, 8)}>Sleep 8 hours</Btn>
          <Btn onClick={() => setHall(hall ? null : hallName)}>{hall ? "Hide rooms" : "Explore rooms & students"}</Btn>
        </>}
      </div>
      {hall && <HallRooms hall={hall} act={act} invite={(n) => setS((p) => ({ ...p, roommates: [...new Set([...p.roommates, n])] }))} />}
    </div>
  );
}

function HallRooms({ hall, act, invite }: { hall: string; act: ActFn; invite: (n: string) => void }) {
  const rooms = useMemo(() => roomsFor(hall), [hall]);
  const [note, setNote] = useState<{ to: string; text: string } | null>(null);
  return (
    <div className="space-y-2">
      {rooms.map((r) => (
        <div key={r.room} className="rounded-md border border-border p-2">
          <div className="mb-1 flex justify-between font-mono text-xs"><b>Room {r.room}</b><span className="text-muted-foreground">{r.occupants.length}/4</span></div>
          {r.occupants.map((o) => (
            <div key={o.name} className="flex items-center justify-between gap-2 py-1 text-sm">
              <span><span className={o.home ? "text-accent" : "text-muted-foreground"}>●</span> {o.name} <span className="text-xs text-muted-foreground">{o.level} {o.faculty}</span></span>
              <span className="flex gap-1 text-xs">
                <button className="rounded bg-muted px-2 py-1" onClick={() => act(o.home ? `Knocked — ${o.name} let you in for gist` : `Knocked on ${r.room}, nobody home`, { sanity: o.home ? 6 : 0 }, 1)}>Knock</button>
                <button className="rounded bg-muted px-2 py-1" onClick={() => setNote({ to: o.name, text: "" })}>Note</button>
                <button className="rounded bg-muted px-2 py-1" onClick={() => { invite(o.name); act(`Invited ${o.name} to squat with you`, { sanity: 2 }, 0); }}>Squat</button>
              </span>
            </div>
          ))}
        </div>
      ))}
      {note && (
        <Modal title={`Note to ${note.to}`} onClose={() => setNote(null)}>
          <textarea className="h-24 w-full rounded-md border border-input bg-background p-2 text-sm" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} placeholder="Slide it under the door…" />
          <button className="mt-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={() => { act(`Slid a note to ${note.to}: "${note.text.slice(0, 40)}"`, { sanity: 2 }, 0); setNote(null); }}>Send note</button>
        </Modal>
      )}
    </div>
  );
}

const DECOR = ["🛏️ Fresh bedsheet", "💡 Rechargeable lamp", "🪞 Mirror", "🖼️ Afrobeats poster", "🧺 Bucket & kettle", "🔌 Extension box", "🪴 Small plant", "📦 Provisions box"];
function MyRoom({ s, setS, act }: { s: Save; setS: React.Dispatch<React.SetStateAction<Save>>; act: ActFn }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold">{s.profile!.residence} · {s.profile!.room || "Off-campus"}</h2>
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
        {s.roommates.length ? s.roommates.map((r) => <div key={r} className="text-sm">• {r}</div>) : <p className="text-sm text-muted-foreground">Invite people from the hostel rooms list.</p>}
      </div>
    </div>
  );
}

function Board({ posts, author, add }: { posts: Post[]; author: string; add: (p: Post) => void }) {
  const [t, setT] = useState(""); const [b, setB] = useState("");
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold">📌 Campus Noticeboard</h2>
      <div className="space-y-2 rounded-md bg-muted p-2">
        <input className="w-full rounded border border-input bg-background p-2 text-sm" placeholder="Gig / business title" value={t} onChange={(e) => setT(e.target.value)} />
        <textarea className="w-full rounded border border-input bg-background p-2 text-sm" placeholder="Details, location, price…" value={b} onChange={(e) => setB(e.target.value)} />
        <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground" onClick={() => { if (!t) return; add({ id: Date.now(), author, title: t, body: b }); setT(""); setB(""); }}>Pin it</button>
      </div>
      {posts.map((p) => (
        <div key={p.id} className="rotate-[-0.5deg] rounded-md border-l-4 border-primary bg-secondary p-3 even:rotate-[0.5deg]">
          <div className="font-semibold">{p.title}</div><p className="text-sm">{p.body}</p><div className="mt-1 font-mono text-[10px] text-muted-foreground">— {p.author}</div>
        </div>
      ))}
    </div>
  );
}

function Politics({ votes, vote }: { votes: Record<string, string>; vote: (o: string, id: string) => void }) {
  const offices = [...new Set(CANDIDATES.map((c) => c.office))];
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">🗳️ SUG & Hall Elections</h2>
      {offices.map((o) => (
        <div key={o} className="space-y-2">
          <div className="font-mono text-xs uppercase text-muted-foreground">{o}</div>
          {CANDIDATES.filter((c) => c.office === o).map((c) => (
            <div key={c.id} className={`rounded-md border p-3 ${votes[o] === c.id ? "border-primary" : "border-border"}`}>
              <div className="font-semibold">{c.name}</div>
              <p className="text-sm text-muted-foreground">{c.manifesto}</p>
              <button disabled={!!votes[o]} onClick={() => vote(o, c.id)} className="mt-2 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40">{votes[o] === c.id ? "Your vote ✓" : "Vote"}</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Cbt({ onDone }: { onDone: (score: number) => void }) {
  const qs = useMemo(() => [...CBT_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5), []);
  const [i, setI] = useState(0); const [score, setScore] = useState(0); const [time, setTime] = useState(60);
  useEffect(() => { const t = setInterval(() => setTime((x) => x - 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (time <= 0 || i >= qs.length) onDone(score); }, [time, i]); // eslint-disable-line
  if (i >= qs.length) return null;
  const q = qs[i];
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

function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [p, setP] = useState<Profile>({ name: "", email: "", matric: "", faculty: FACULTIES[0], dept: "", level: "100L", residence: `${HOSTELS[0]} Hall`, room: "" });
  const [step, setStep] = useState(0); const [code, setCode] = useState(""); const [sent, setSent] = useState("");
  const f = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setP({ ...p, [k]: e.target.value });
  const inp = "w-full rounded-md border border-input bg-background p-2.5 text-sm";
  const validEmail = /@(live\.)?unilag\.edu\.ng$/i.test(p.email) && /^\d{9}$/.test(p.matric);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <h1 className="font-display text-5xl font-extrabold text-primary">unilaglife<span className="text-foreground">.app</span></h1>
        <p className="mb-6 mt-2 text-muted-foreground">Live the Akoka experience — hostels, New Hall, SUG wahala, CBT and TDB nights.</p>
        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          {step === 0 && <>
            <input className={inp} placeholder="Full name" value={p.name} onChange={f("name")} />
            <input className={inp} placeholder="Student email (e.g. 190401001@live.unilag.edu.ng)" value={p.email} onChange={f("email")} />
            <input className={inp} placeholder="Matric number (9 digits)" value={p.matric} onChange={f("matric")} />
            <button disabled={!p.name || !validEmail} onClick={() => { setSent(String(Math.floor(100000 + Math.random() * 900000))); setStep(1); }} className="w-full rounded-md bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-40">Verify student email</button>
          </>}
          {step === 1 && <>
            <p className="text-sm">Demo verification code: <b className="font-mono text-primary">{sent}</b></p>
            <input className={inp} placeholder="Enter 6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
            <button disabled={code !== sent} onClick={() => setStep(2)} className="w-full rounded-md bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-40">Confirm</button>
          </>}
          {step === 2 && <>
            <select className={inp} value={p.faculty} onChange={f("faculty")}>{FACULTIES.map((x) => <option key={x}>{x}</option>)}</select>
            <input className={inp} placeholder="Department" value={p.dept} onChange={f("dept")} />
            <select className={inp} value={p.level} onChange={f("level")}>{LEVELS.map((x) => <option key={x}>{x}</option>)}</select>
            <select className={inp} value={p.residence} onChange={f("residence")}>{[...HOSTELS.map((h) => `${h} Hall`), "Off-Campus (Akoka)", "Off-Campus (Abule-Oja)"].map((x) => <option key={x}>{x}</option>)}</select>
            {!p.residence.startsWith("Off") && <input className={inp} placeholder="Room (e.g. B214)" value={p.room} onChange={f("room")} />}
            <button disabled={!p.dept} onClick={() => onDone(p)} className="w-full rounded-md bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-40">Enter campus</button>
          </>}
        </div>
      </div>
    </div>
  );
}
