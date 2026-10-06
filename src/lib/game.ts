export type LocType =
  | "gate"
  | "admin"
  | "food"
  | "library"
  | "faculty"
  | "hostel"
  | "sports"
  | "lagoon"
  | "offcampus"
  | "business"
  | "road";

export interface Loc {
  id: string;
  name: string;
  type: LocType;
  x: number;
  y: number;
  blurb: string;
}

export const LOCATIONS: Loc[] = [
  {
    id: "gate",
    name: "Main Gate",
    type: "gate",
    x: 90,
    y: 560,
    blurb: "Security checks, ID cards, and the first breath of Akoka.",
  },
  {
    id: "unirad",
    name: "University Road",
    type: "road",
    x: 230,
    y: 470,
    blurb: "The spine of campus. Shuttles and keke everywhere.",
  },
  {
    id: "senate",
    name: "Senate Building",
    type: "admin",
    x: 420,
    y: 330,
    blurb: "Admin, SUG politics, and the iconic tower.",
  },
  {
    id: "newhall",
    name: "New Hall",
    type: "food",
    x: 560,
    y: 470,
    blurb: "Korede Spag, Iya Moria amala, suya and plenty gist.",
  },
  {
    id: "library",
    name: "Akintunde Ojo Library",
    type: "library",
    x: 520,
    y: 230,
    blurb: "Quiet floors, AC, and serious faces.",
  },
  {
    id: "science",
    name: "Faculty of Science",
    type: "faculty",
    x: 660,
    y: 200,
    blurb: "Labs, practicals, and CBT halls.",
  },
  {
    id: "engineering",
    name: "Faculty of Engineering",
    type: "faculty",
    x: 760,
    y: 300,
    blurb: "Workshops and drawing boards.",
  },
  {
    id: "law",
    name: "Faculty of Law",
    type: "faculty",
    x: 330,
    y: 220,
    blurb: "Moot court and well-ironed shirts.",
  },
  {
    id: "arts",
    name: "Faculty of Arts",
    type: "faculty",
    x: 300,
    y: 340,
    blurb: "Theatre, languages, and poetry corners.",
  },
  {
    id: "tdb",
    name: "TDB (Tolu Dina Block)",
    type: "library",
    x: 640,
    y: 360,
    blurb: "Night reading spot — the 'Till Day Break' grind.",
  },
  {
    id: "sports",
    name: "Sports Centre",
    type: "sports",
    x: 200,
    y: 180,
    blurb: "Track, football pitch, and hall week matches.",
  },
  {
    id: "biz",
    name: "Business Strip",
    type: "business",
    x: 450,
    y: 520,
    blurb: "POS kiosk, cybercafe, print shop, hair salon.",
  },
  {
    id: "jaja",
    name: "Jaja Hall",
    type: "hostel",
    x: 720,
    y: 520,
    blurb: "Male hall, loud and proud.",
  },
  {
    id: "mariere",
    name: "Mariere Hall",
    type: "hostel",
    x: 820,
    y: 450,
    blurb: "Male hall famous for hall week.",
  },
  {
    id: "moremi",
    name: "Moremi Hall",
    type: "hostel",
    x: 380,
    y: 600,
    blurb: "Female hall, iconic and organized.",
  },
  {
    id: "amina",
    name: "Amina Hall",
    type: "hostel",
    x: 500,
    y: 640,
    blurb: "Female hall near the lagoon breeze.",
  },
  {
    id: "eninjoku",
    name: "Eni Njoku Hall",
    type: "hostel",
    x: 860,
    y: 560,
    blurb: "Male hall, big on politics.",
  },
  {
    id: "biobaku",
    name: "Biobaku Hall",
    type: "hostel",
    x: 640,
    y: 640,
    blurb: "Male hall with solid community.",
  },
  {
    id: "kofo",
    name: "Kofo Hall",
    type: "hostel",
    x: 280,
    y: 640,
    blurb: "Female hall, postgraduate vibes.",
  },
  {
    id: "lagoon",
    name: "Lagoon Front",
    type: "lagoon",
    x: 920,
    y: 260,
    blurb: "Breeze, sunset, dates and deep thoughts.",
  },
  {
    id: "akoka",
    name: "Akoka",
    type: "offcampus",
    x: 60,
    y: 380,
    blurb: "Off-campus apartments and cheap bukas.",
  },
  {
    id: "abuleoja",
    name: "Abule-Oja",
    type: "offcampus",
    x: 110,
    y: 660,
    blurb: "Bustling market, off-campus lodges.",
  },
];

export const ROAD_LINKS: [string, string][] = [
  ["gate", "unirad"],
  ["unirad", "senate"],
  ["unirad", "biz"],
  ["unirad", "arts"],
  ["unirad", "akoka"],
  ["gate", "abuleoja"],
  ["senate", "library"],
  ["senate", "law"],
  ["senate", "arts"],
  ["law", "sports"],
  ["library", "science"],
  ["science", "engineering"],
  ["engineering", "lagoon"],
  ["senate", "tdb"],
  ["tdb", "newhall"],
  ["biz", "newhall"],
  ["newhall", "jaja"],
  ["jaja", "mariere"],
  ["mariere", "eninjoku"],
  ["jaja", "biobaku"],
  ["biz", "moremi"],
  ["moremi", "amina"],
  ["moremi", "kofo"],
  ["engineering", "mariere"],
  ["tdb", "engineering"],
];

export const FACULTIES = [
  "Science",
  "Engineering",
  "Law",
  "Arts",
  "Medilag (Medicine)",
  "Social Sciences",
  "Management Sciences",
  "Education",
  "Environmental Sciences",
];
export const LEVELS = ["100L", "200L", "300L", "400L", "500L"];
export const HOSTELS = ["Jaja", "Mariere", "Moremi", "Amina", "Eni Njoku", "Biobaku", "Kofo"];

export type Transport = "walk" | "keke" | "shuttle";
export const TRANSPORT: Record<
  Transport,
  { label: string; speed: number; energyPer: number; fare: number }
> = {
  walk: { label: "Walk", speed: 1, energyPer: 6, fare: 0 },
  keke: { label: "Keke Napep", speed: 3, energyPer: 1, fare: 150 },
  shuttle: { label: "Campus Shuttle", speed: 2.2, energyPer: 1, fare: 100 },
};

export function dist(a: Loc, b: Loc) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export const FOODS = [
  { name: "Korede Spag", price: 1200, hunger: 35, sanity: 5 },
  { name: "Iya Moria Amala & Ewedu", price: 1500, hunger: 45, sanity: 8 },
  { name: "Suya (stick)", price: 800, hunger: 15, sanity: 6 },
  { name: "Pure water + Gala", price: 300, hunger: 10, sanity: 1 },
];

export const FIRST = [
  "Tunde",
  "Chioma",
  "Ifeoma",
  "Segun",
  "Aisha",
  "Emeka",
  "Bisola",
  "Kelechi",
  "Zainab",
  "Dayo",
  "Ngozi",
  "Femi",
  "Halima",
  "Uche",
  "Tobi",
  "Amaka",
];
export const LAST = [
  "Adeyemi",
  "Okafor",
  "Bello",
  "Nwosu",
  "Balogun",
  "Eze",
  "Lawal",
  "Okonkwo",
  "Ibrahim",
  "Ogunleye",
];

export function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

export function roomsFor(hall: string) {
  const r = seeded(hall.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  return Array.from({ length: 8 }, (_, i) => {
    const n = 1 + Math.floor(r() * 4);
    return {
      room: `${String.fromCharCode(65 + (i % 4))}${100 + Math.floor(r() * 300)}`,
      occupants: Array.from({ length: n }, () => ({
        name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
        level: LEVELS[Math.floor(r() * LEVELS.length)],
        faculty: FACULTIES[Math.floor(r() * FACULTIES.length)],
        home: r() > 0.4,
      })),
    };
  });
}

export const RANDOM_EVENTS = [
  {
    title: "ASUU Strike declared!",
    text: "Lectures suspended for the day. Sanity drops but you get rest.",
    fx: { sanity: -10, energy: 15 },
  },
  {
    title: "Hostel water wahala",
    text: "No water in the hall. You carried buckets from the borehole.",
    fx: { energy: -12, sanity: -8 },
  },
  {
    title: "Gate security check",
    text: "Security asked for your ID card. Small delay at the gate.",
    fx: { sanity: -4 },
  },
  {
    title: "Hall week money spraying!",
    text: "You caught some naira at a hall week concert.",
    fx: { money: 1500, sanity: 12 },
  },
  {
    title: "Meal voucher drop",
    text: "An aspirant shared meal vouchers on University Road.",
    fx: { hunger: 20 },
  },
  { title: "NEPA took light", text: "Power outage. Your phone is at 5%.", fx: { sanity: -6 } },
];

export const CANDIDATES = [
  {
    id: "c1",
    office: "SUG President",
    name: "Adebayo 'Chairman' Ojo",
    manifesto: "24/7 shuttles, free Wi-Fi in every hall, and an end to water wahala.",
  },
  {
    id: "c2",
    office: "SUG President",
    name: "Chiamaka Nwachukwu",
    manifesto: "Transparent SUG budget, cheaper New Hall food, and a student welfare fund.",
  },
  {
    id: "c3",
    office: "SUG President",
    name: "Ibrahim Musa",
    manifesto: "Bigger hall week, more CBT centres, and an exam stress clinic.",
  },
  {
    id: "h1",
    office: "Hall Chairman",
    name: "Kunle Akande",
    manifesto: "Fix the bathrooms, quarterly hall parties, and fair room allocation.",
  },
  {
    id: "h2",
    office: "Hall Chairman",
    name: "Grace Okeke",
    manifesto: "Reading room upgrades, borehole maintenance, and solar lights.",
  },
];

export const CBT_QUESTIONS = [
  { q: "UNILAG was founded in which year?", a: ["1962", "1948", "1975", "1980"], c: 0 },
  { q: "UNILAG's motto is 'In Deed and in ___'", a: ["Truth", "Faith", "Hope", "Light"], c: 0 },
  { q: "2 + 2 × 2 = ?", a: ["8", "6", "4", "10"], c: 1 },
  { q: "The chemical symbol for sodium is?", a: ["So", "S", "Na", "Sd"], c: 2 },
  { q: "Which body leads student governance?", a: ["NUT", "SUG", "ASUU", "NANS"], c: 1 },
  { q: "A 5.0 CGPA scale: First Class starts at?", a: ["4.0", "4.5", "3.5", "5.0"], c: 1 },
  { q: "Speed = distance ÷ ?", a: ["mass", "time", "force", "area"], c: 1 },
  { q: "Lagos was Nigeria's capital until?", a: ["1991", "1960", "2000", "1976"], c: 0 },
];
