import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Tables } from "@/integrations/supabase/types";
import { FACULTIES, LEVELS, HOSTELS } from "@/lib/game";

type Profile = Tables<"profiles">;
type Line = { who: "guard" | "you" | "npc" | "narrator"; name?: string; text: string };
type Details = { name: string; faculty: string; dept: string; level: string; residence: string; room: string; bio: string };
const PENDING = "unilag-pending-profile";
const RESIDENCES = [...HOSTELS.map((h) => `${h} Hall`), "Off-Campus (Akoka)", "Off-Campus (Abule-Oja)"];

type Stage =
  | "halt" | "returning" | "name" | "faculty" | "dept" | "level" | "residence" | "room" | "remember" | "logbook" | "checkmail"
  | "outside" | "turnstile";

export function Gate({ userId, onProfile }: { userId?: string; onProfile?: (p: Profile) => void }) {
  const [lines, setLines] = useState<Line[]>(() => userId
    ? [{ who: "guard", name: "Sgt. Adewale", text: "Ehen! I see you've signed the visitor logbook before, but I don't have your student details. Let's sort it quick." }, { who: "guard", name: "Sgt. Adewale", text: "Wetin be your full name?" }]
    : [{ who: "narrator", text: "Main Gate, UNILAG. Danfos honk on Herbert Macaulay Way. Two guards in navy-blue uniforms are leaning on the barrier. One straightens up as you come close." }, { who: "guard", name: "Sgt. Adewale", text: "Halt! Oya, stop there. Are you entering campus?" }]);
  const [stage, setStage] = useState<Stage>(userId ? "name" : "halt");
  const [d, setD] = useState<Details>({ name: "", faculty: "", dept: "", level: "", residence: "", room: "", bio: "" });
  const [text, setText] = useState(""); const [pw, setPw] = useState(""); const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [lines, stage]);

  const say = (...l: Line[]) => setLines((x) => [...x, ...l]);
  const g = (t: string): Line => ({ who: "guard", name: "Sgt. Adewale", text: t });
  const g2 = (t: string): Line => ({ who: "guard", name: "Cpl. Ngozi", text: t });
  const me = (t: string): Line => ({ who: "you", text: t });

  async function finishProfile(details: Details, uid: string) {
    const { data, error } = await supabase.from("profiles").insert({ ...details, room: details.residence.startsWith("Off") ? "" : details.room, user_id: uid }).select().single();
    if (error) { say(g(`Hmm, the system dey hang: ${error.message}`)); return; }
    localStorage.removeItem(PENDING);
    say(g("Clear! Turnstile is open. Welcome to the University of Lagos. In Deed and in Truth!"));
    setStage("turnstile");
    setTimeout(() => onProfile?.(data), 1600);
  }

  function choose(label: string, next: () => void) { return { label, next }; }
  const choices: { label: string; next: () => void }[] = [];

  if (stage === "halt") choices.push(
    choice("Yes, heading into school", () => { say(me("Yes sir, I'm heading into school."), g("Hmm. Let me look at you well."), { who: "narrator", text: "He looks you up and down, then glances at your bag." }, g2("He look like fresher o. See as the eyes dey shine."), g("Are you new here, or have I seen your face before?")); setStage("returning"); }),
    choice("No, just hanging around outside", () => { say(me("No o, I'm just hanging around outside."), g("No wahala. Just don't block the gate. If you change your mind, come back.")); setStage("outside"); }),
    choice("Who wants to know?", () => { say(me("Who wants to know?"), g("Ehn?! Na me, Sergeant Adewale, 15 years at this gate. Don't let me seize your ID. I'll ask again: are you entering?")); }),
  );
  if (stage === "returning") choices.push(
    choice("I'm new — first time entering", () => { say(me("I'm new, sir."), g("Ehen, fresher! Welcome. I'll need your details for the logbook. Wetin be your full name?")); setStage("name"); }),
    choice("You've seen me before, oga", () => { say(me("Oga, you know me now! I've been here before."), g("Okay, show me your gate pass. Write your email and password in my book.")); setStage("logbook"); setD((x) => ({ ...x, name: "__returning" })); }),
    choice("Flash my Google pass", () => { say(me("I have my Google pass, sir."), g("Ehen, modern student. Scan am.")); lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); }),
  );
  if (stage === "faculty") FACULTIES.forEach((f) => choices.push(choice(f, () => {
    setD((x) => ({ ...x, faculty: f }));
    const banter: Record<string, string> = { "Medilag (Medicine)": "Ah, doctor! Abeg check my blood pressure when you finish.", Law: "Lawyer! Don't sue me o.", Engineering: "Engineer! Come and fix this turnstile, e don spoil since 2019.", Arts: "Arts! You fit write poem for my wife?" };
    say(me(f), g(banter[f] ?? `${f}. Okay, that's a solid faculty.`), g("And which department?")); setStage("dept");
  })));
  if (stage === "level") LEVELS.forEach((l) => choices.push(choice(l, () => {
    setD((x) => ({ ...x, level: l }));
    say(me(l), l === "100L" ? g2("I talk am! JJC. Don't let anyone sell the school library to you o.") : l === "500L" ? g("Final year! Your project don finish? Hmm.") : g("Okay, stalite."), g("Which hall are you staying in?"));
    setStage("residence");
  })));
  if (stage === "residence") RESIDENCES.forEach((r) => choices.push(choice(r, () => {
    setD((x) => ({ ...x, residence: r }));
    if (r.startsWith("Off")) { say(me(r), g("Off-campus. Mind those Akoka landlords o."), g("Last question. Should I remember your face for next time?")); setStage("remember"); }
    else { say(me(r), g(r.includes("Jaja") || r.includes("Mariere") ? `${r}? Una dey make noise for night o!` : `${r}. Respect.`), g("Which room number?")); setStage("room"); }
  })));
  if (stage === "remember") choices.push(
    choice("Yes, remember my face", () => { setRemember(true); say(me("Yes sir, remember me."), g("I've marked your face. Next time I'll just wave you in. Now write your email and a password in my book for your gate pass.")); setStage("logbook"); }),
    choice("No, ask me every time", () => { setRemember(false); say(me("No, ask me every time."), g("Security conscious. I like am. Write your email and password in my book.")); setStage("logbook"); }),
  );
  if (stage === "outside") choices.push(
    choice("Buy Gala & cold Fanta from the hawker", () => say(me("Mama, abeg one Gala and cold Fanta."), { who: "npc", name: "Iya Bose (hawker)", text: "₦700, my pikin. E cold well well. You no go buy pure water join?" }, me("Make I manage this one first."))),
    choice("Check the Abule-Oja roadside food stalls", () => say({ who: "narrator", text: "Smoke rises from roasting corn and boli. A woman fries puff-puff in a black pot." }, { who: "npc", name: "Mama Put", text: "Rice and beans with two meat, ₦1,200! Fresh fish dey too. Come and chop!" })),
    choice("Wait at the Yaba danfo bus stop", () => say({ who: "npc", name: "Danfo conductor", text: "Yaba! Yaba! Ojuelegba! Enter with your change o, I no get change!" }, me("How much to Yaba?"), { who: "npc", name: "Danfo conductor", text: "₦300. Shift, shift, four for back seat!" })),
    choice("Chill with the gate loafers", () => say({ who: "npc", name: "Bayo (loafer)", text: "Guy, you see that SUG aspirant wey dey share meal vouchers yesterday? Na him I dey wait." }, { who: "npc", name: "Kunle (loafer)", text: "Abeg, the man dey owe me since last session. Wetin you dey find for gate?" }, me("Just dey look around."))),
    choice("Run an errand (+gist)", () => say({ who: "npc", name: "Alhaji (POS man)", text: "My friend, help me carry this carton go that kiosk. I go dash you Gala." }, { who: "narrator", text: "You carry the carton. Alhaji gives you a Gala and a thumbs-up." })),
    choice("Go back to the gate", () => { say(me("Oga, I've changed my mind. I want to enter."), g("I knew it. Are you new or have I seen your face before?")); setStage("returning"); }),
  );

  function choice(label: string, next: () => void) { return choose(label, next); }

  function submitText() {
    const v = text.trim(); if (!v) return;
    setText("");
    if (stage === "name") { setD((x) => ({ ...x, name: v })); say(me(`My name is ${v}.`), g(`${v.split(" ")[0]}... nice name. Which faculty?`)); setStage("faculty"); }
    else if (stage === "dept") { setD((x) => ({ ...x, dept: v })); say(me(v), g("Okay. What level are you?")); setStage("level"); }
    else if (stage === "room") {
      setD((x) => ({ ...x, room: v.toUpperCase() })); say(me(`Room ${v.toUpperCase()}.`));
      if (userId) { finishProfile({ ...d, room: v.toUpperCase() }, userId); return; }
      say(g("Last question. Should I remember your face for next time?")); setStage("remember");
    }
  }

  // Google user without profile: when residence is off-campus, skip remember step
  useEffect(() => { if (userId && stage === "remember") finishProfile(d, userId); }, [stage]); // eslint-disable-line

  async function logbook() {
    if (!text.includes("@") || pw.length < 6) return say(g("Abeg write a proper email and a password of at least 6 characters."));
    setBusy(true);
    localStorage.setItem("unilag-remember", remember ? "1" : "0");
    sessionStorage.setItem("unilag-tab", "1");
    const returning = d.name === "__returning";
    if (returning) {
      const { error } = await supabase.auth.signInWithPassword({ email: text.trim(), password: pw });
      setBusy(false);
      if (error) return say(g(`This gate pass no correct o: ${error.message}. Try again.`));
      say(g("Ah, na you! Pass, my guy.")); setStage("turnstile"); return;
    }
    localStorage.setItem(PENDING, JSON.stringify(d));
    const { data, error } = await supabase.auth.signUp({ email: text.trim(), password: pw, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return say(g(`Wahala: ${error.message}`));
    if (data.session && data.user) return finishProfile(d, data.user.id);
    say(g2("The system has sent a gate pass link to your email. Open it, then come back and I'll let you in."));
    setStage("checkmail");
  }

  const textStage = stage === "name" || stage === "dept" || stage === "room";
  const placeholder = { name: "Your full name", dept: "e.g. Computer Science", room: "e.g. B214" } as Record<string, string>;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-secondary to-transparent" />
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col p-4">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-3xl font-extrabold text-primary">unilaglife<span className="text-foreground">.app</span></h1>
          <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">{stage === "outside" ? "📍 Outside Main Gate" : "📍 Main Gate checkpoint"}</span>
        </header>
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2 rounded-lg border border-border bg-card p-4 text-center">
          <div className="text-4xl">💂🏾‍♂️<div className="font-mono text-[10px] text-muted-foreground">Sgt. Adewale</div></div>
          <div className={`rounded-md border-2 px-6 py-3 font-display font-bold transition-colors ${stage === "turnstile" ? "border-accent text-accent" : "border-destructive text-destructive"}`}>{stage === "turnstile" ? "▶ OPEN" : "■ BARRIER"}<div className="font-mono text-[10px] text-muted-foreground">UNIVERSITY OF LAGOS</div></div>
          <div className="text-4xl">👮🏾‍♀️<div className="font-mono text-[10px] text-muted-foreground">Cpl. Ngozi</div></div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {lines.map((l, i) => (
            <div key={i} className={`flex ${l.who === "you" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
              {l.who === "narrator"
                ? <p className="mx-auto max-w-md text-center text-sm italic text-muted-foreground">{l.text}</p>
                : <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${l.who === "you" ? "rounded-br-sm bg-primary text-primary-foreground" : l.who === "guard" ? "rounded-bl-sm bg-secondary" : "rounded-bl-sm border border-border bg-card"}`}>
                    {l.name && <div className="font-mono text-[10px] uppercase opacity-70">{l.name}</div>}
                    <div>{l.text}</div>
                  </div>}
            </div>
          ))}
          <div ref={end} />
        </div>

        <div className="sticky bottom-0 space-y-2 border-t border-border bg-background pt-3">
          {choices.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{choices.map((c) => (
            <button key={c.label} onClick={c.next} className="rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm hover:border-primary hover:bg-muted">▸ {c.label}</button>
          ))}</div>}
          {textStage && (
            <form onSubmit={(e) => { e.preventDefault(); submitText(); }} className="flex gap-2">
              <input autoFocus className="flex-1 rounded-lg border border-input bg-card p-2.5 text-sm" placeholder={placeholder[stage]} value={text} onChange={(e) => setText(e.target.value)} />
              <button className="rounded-lg bg-primary px-4 font-semibold text-primary-foreground">Answer</button>
            </form>
          )}
          {stage === "logbook" && (
            <form onSubmit={(e) => { e.preventDefault(); logbook(); }} className="space-y-2 rounded-lg border border-dashed border-primary p-3">
              <div className="font-mono text-xs text-muted-foreground">📒 Security logbook</div>
              <input className="w-full rounded border border-input bg-card p-2 text-sm" type="email" placeholder="Email (your @live.unilag.edu.ng works best)" value={text} onChange={(e) => setText(e.target.value)} />
              <input className="w-full rounded border border-input bg-card p-2 text-sm" type="password" placeholder="Password (min 6)" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button disabled={busy} className="w-full rounded bg-primary py-2 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Checking…" : "Sign the logbook"}</button>
            </form>
          )}
          {stage === "checkmail" && <button onClick={() => { say(g("Came back? Write your email and password again.")); setD((x) => ({ ...x, name: "__returning" })); setStage("logbook"); }} className="w-full rounded-lg border border-border p-2.5 text-sm hover:border-primary">▸ I've opened the link — let me in</button>}
        </div>
      </div>
    </div>
  );
}

export const PENDING_PROFILE_KEY = PENDING;
