// כלים משותפים: עזרי DOM, אייקונים, תאריכים, חלון תחתון, הקטנת תמונה וקבועים.
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const COLORS = ["#1f57e0", "#ff6b2c", "#1fa971", "#7a4dfd", "#e8438b", "#f2a900"];

/* שלבי האימון */
export const STAGES = [
  { k: "warmup", label: "חימום", color: "#ff6b2c" },
  { k: "minigame", label: "משחקון קטן", color: "#1fa971" },
  { k: "basics", label: "יסודות המשחק", color: "#1f57e0" },
  { k: "finale", label: "משחק סיום", color: "#7a4dfd" }
];
export const STAGE = Object.fromEntries(STAGES.map((s) => [s.k, s]));
export const FOCUS = { pass: "מסירות", dribble: "כדרור", shoot: "זריקה", defense: "הגנה", team: "משחק קבוצתי", move: "תנועה ותיאום" };
export const DAY_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  groups: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.7 4 4.5"/></svg>',
  plans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM8.5 11h7M8.5 15h5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 00-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#f2a900" stroke="#f2a900" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  cake: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16v-6a3 3 0 00-3-3H7a3 3 0 00-3 3zM4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0M12 11V7M12 3.5c1 1 1 2 0 3-1-1-1-2 0-3z"/></svg>',
  camera: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  image: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg>'
};

/* קווי מגרש כדור יד: קו שער, קו 6 מטר (רצוף) וקו 9 מטר (מקווקו) */
export const courtSVG = (flip = false) => `<svg class="court" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" fill="none" stroke="#ffc93c" stroke-width="2.2" aria-hidden="true"${flip ? ' style="transform:scaleY(-1)"' : ""}>
  <path d="M90 160 A110 110 0 0 1 310 160"/><path d="M20 160 A180 180 0 0 1 380 160" stroke-dasharray="10 9"/>
  <path d="M170 160v-10h60v10" stroke-width="4"/><path d="M0 160h400"/></svg>`;

export const jersey = (num, color) => `<svg class="jersey" viewBox="0 0 48 46" aria-hidden="true">
  <path d="M15 4 L5 10 L9 20 L13 18 V42 H35 V18 L39 20 L43 10 L33 4 C31 8 27 9.5 24 9.5 C21 9.5 17 8 15 4Z" fill="${color}"/>
  <path d="M15 4 C17 8 21 9.5 24 9.5 C27 9.5 31 8 33 4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
  <text x="24" y="33" text-anchor="middle" font-size="14" fill="#fff" font-family="Secular One, sans-serif">${esc(num || "")}</text></svg>`;
/* תמונת הילד אם יש, אחרת חולצה עם מספר */
export const avatar = (p, color) => (p?.photo
  ? `<span class="av"><img src="${p.photo}" alt="">${p.number ? `<i>${esc(p.number)}</i>` : ""}</span>`
  : jersey(p?.number, color));

/* ---------- תאריכים ---------- */
const pad = (n) => String(n).padStart(2, "0");
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const fmtDate = (s) => (s ? new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(s + "T12:00:00")) : "");
export const fmtShort = (s) => (s ? new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" }).format(new Date(s + "T12:00:00")) : "");
export const monthKey = (s) => String(s).slice(0, 7);
export const monthLabel = (k) => new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(k + "-15T12:00:00"));
export function lastMonths(n = 12) {
  const out = [], d = new Date(); d.setDate(15);
  for (let i = 0; i < n; i++) { out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); d.setMonth(d.getMonth() - 1); }
  return out;
}
export const weekdayOf = (s) => new Date(s + "T12:00:00").getDay();
// לוח אימונים: g.schedule = [{day, time}], כל יום עם שעה משלו. תמיכה לאחור ב-days+time של גרסה 2.0
export const scheduleOf = (g) => (g?.schedule?.length ? g.schedule : (g?.days || []).map((day) => ({ day, time: g.time || "" })));
export const daysLabel = (g) => { const sc = scheduleOf(g); return sc.length ? sc.slice().sort((a, b) => a.day - b.day).map((x) => DAY_SHORT[x.day] + (x.time ? " " + x.time : "")).join(" · ") : g?.when || ""; };

export const firstName = (u) => (u?.displayName || "").split(" ")[0] || "מאמן";
export const waLink = (phone) => { const d = String(phone || "").replace(/\D/g, ""); return d ? "https://wa.me/" + (d.startsWith("0") ? "972" + d.slice(1) : d) : ""; };
export function debounce(fn, ms) { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; f.flush = () => { clearTimeout(t); fn(); }; return f; }
export function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("hidden"), 2400);
}
/* תיקון ידוע באנדרואיד: שדה תאריך לא תמיד יורה change, לכן מאזינים לשלושה אירועים */
export function dateInput(el, cb) {
  const h = debounce(() => el.value && cb(el.value), 120);
  ["change", "input", "blur"].forEach((ev) => el.addEventListener(ev, h));
}

/* ---------- חלון תחתון ---------- */
const sheet = $("#sheet");
export function openSheet(html, mount) {
  $("#sheetBody").innerHTML = html;
  if (!sheet.open) sheet.showModal();
  $("#sheetBody").scrollTop = 0;
  mount?.($("#sheetBody"));
}
export const closeSheet = () => sheet.open && sheet.close();
sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

/* הקטנת תמונה לריבוע של 320 פיקסלים (בערך 25KB), כדי שתישמר בנתונים בלי Storage נפרד */
export async function resizeImage(file, size = 320) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(bmp.width, bmp.height);
  const c = Object.assign(document.createElement("canvas"), { width: size, height: size });
  c.getContext("2d").drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL("image/jpeg", 0.8);
}

/* ---------- ימי הולדת ---------- */
// שבוע = ראשון עד שבת, סביב התאריך שנתנו
export function weekRange(ref = new Date()) {
  const s = new Date(ref); s.setHours(12, 0, 0, 0); s.setDate(s.getDate() - s.getDay());
  const e = new Date(s); e.setDate(s.getDate() + 6); return [s, e];
}
export function birthdaysInWeek(players, ref = new Date()) {
  const [s, e] = weekRange(ref), out = [];
  for (const p of players) {
    if (!p.birth) continue;
    const [y, m, d] = p.birth.split("-").map(Number);
    for (const yr of new Set([s.getFullYear(), e.getFullYear()])) {
      const dt = new Date(yr, m - 1, d, 12);
      if (dt >= s && dt <= e) { out.push({ p, date: dt, age: yr - y }); break; }
    }
  }
  return out.sort((a, b) => a.date - b.date);
}
