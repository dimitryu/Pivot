import { store } from "./store.js";
import { SEED_PLANS } from "./seed.js";

const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COLORS = ["#1f57e0", "#ff6b2c", "#1fa971", "#7a4dfd", "#e8438b", "#f2a900"];
const VERSION = "1.0.0";

/* ---------- אייקונים ---------- */
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  groups: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5c2.4 0 4 1.7 4 4.5"/></svg>',
  plans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM8.5 11h7M8.5 15h5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 00-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
};

/* קווי מגרש כדור יד: קו שער, קו 6 מטר (רצוף) וקו 9 מטר (מקווקו) */
const courtSVG = (flip = false) => `<svg class="court" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" fill="none" stroke="#ffc93c" stroke-width="2.2" aria-hidden="true"${flip ? ' style="transform:scaleY(-1)"' : ""}>
  <path d="M90 160 A110 110 0 0 1 310 160"/>
  <path d="M20 160 A180 180 0 0 1 380 160" stroke-dasharray="10 9"/>
  <path d="M170 160v-10h60v10" stroke-width="4"/><path d="M0 160h400"/></svg>`;

const jersey = (num, color) => `<svg class="jersey" viewBox="0 0 48 46" aria-hidden="true">
  <path d="M15 4 L5 10 L9 20 L13 18 V42 H35 V18 L39 20 L43 10 L33 4 C31 8 27 9.5 24 9.5 C21 9.5 17 8 15 4Z" fill="${color}"/>
  <path d="M15 4 C17 8 21 9.5 24 9.5 C27 9.5 31 8 33 4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
  <text x="24" y="33" text-anchor="middle" font-size="14" fill="#fff" font-family="Secular One, sans-serif">${esc(num || "")}</text></svg>`;

/* ---------- עזרים ---------- */
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtDate = (s) => (s ? new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(s + "T12:00:00")) : "");
const fmtShort = (s) => (s ? new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" }).format(new Date(s + "T12:00:00")) : "");
const firstName = (u) => (u?.displayName || "").split(" ")[0] || "מאמן";
const waLink = (phone) => { const d = String(phone || "").replace(/\D/g, ""); return d ? "https://wa.me/" + (d.startsWith("0") ? "972" + d.slice(1) : d) : ""; };
const groupColor = (g) => g?.color || COLORS[0];
const playersOf = (gid) => store.all("players").filter((p) => p.groupId === gid).sort((a, b) => (a.name || "").localeCompare(b.name || "", "he"));
const sessionsOf = (gid) => store.all("sessions").filter((s) => s.groupId === gid).sort((a, b) => b.date.localeCompare(a.date));
const presentCount = (s) => Object.values(s.attendance || {}).filter(Boolean).length;
function rate(pid, gid) {
  const ss = sessionsOf(gid); if (!ss.length) return null;
  return Math.round((ss.filter((s) => s.attendance?.[pid]).length / ss.length) * 100);
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("hidden"), 2200);
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
/* תיקון ידוע בדפדפן אנדרואיד: שדה תאריך לא תמיד יורה change, לכן מאזינים לשלושה אירועים */
function dateInput(el, cb) {
  const h = debounce(() => el.value && cb(el.value), 120);
  ["change", "input", "blur"].forEach((ev) => el.addEventListener(ev, h));
}

/* ---------- חלון תחתון ---------- */
const sheet = $("#sheet");
function openSheet(html, mount) {
  $("#sheetBody").innerHTML = html;
  if (!sheet.open) sheet.showModal();
  mount?.($("#sheetBody"));
}
const closeSheet = () => sheet.open && sheet.close();
sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

/* ---------- מסגרת כללית ---------- */
let live = true;
function hero({ title, sub = "", back = "", compact = false, tabs = "" }) {
  return `<header class="hero ${compact ? "compact" : ""}">${courtSVG()}<div class="wrap">
    <div class="topbar">${back ? `<button class="back" data-go="${back}" aria-label="חזרה">${ICON.back}</button>` : `<span class="brand"><i></i>פיבוט</span>`}</div>
    <h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}${tabs}</div></header>`;
}
function nav(active) {
  const item = (k, label, go) => `<button data-go="${go}" ${active === k ? 'aria-current="page"' : ""}>${ICON[k]}<span>${label}</span></button>`;
  return `<nav class="nav">${item("groups", "קבוצות", "#/")}${item("plans", "תוכניות", "#/plans")}${item("settings", "הגדרות", "#/settings")}</nav>`;
}
const page = (heroHtml, body, active) => { app.innerHTML = `${heroHtml}<main class="wrap">${body}</main>${nav(active)}`; };

/* ---------- מסכים ---------- */
function viewLogin() {
  live = false;
  const cloud = store.isCloud;
  app.innerHTML = `<div class="login">${courtSVG()}${courtSVG(true).replace('class="court"', 'class="court" style="transform:scaleY(-1)"')}
    <div class="ball-big"></div><h1>פיבוט</h1><p>קבוצות, נוכחות ותוכניות אימון לכדור יד ילדים</p>
    ${cloud
      ? `<button class="btn" data-act="signin">כניסה עם Google</button>`
      : `<button class="btn" data-act="signin">התחלה במצב מקומי</button>
         <p style="font-size:15px;opacity:.85">עדיין לא חיברנו ענן, ולכן הנתונים נשמרים רק במכשיר הזה.</p>`}
    </div>`;
}

function viewHome() {
  live = true;
  const groups = store.all("groups").slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const cards = groups.map((g) => {
    const n = playersOf(g.id).length, last = sessionsOf(g.id)[0];
    return `<button class="group-card" style="--gc:${groupColor(g)}" data-go="#/g/${g.id}">
      <span class="arc"></span><h3>${esc(g.name)}</h3>
      <span class="meta">${esc([g.ages, g.when].filter(Boolean).join(" · ")) || "&nbsp;"}</span>
      <span style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><span class="chip">${n} ילדים</span>${last ? `<span class="chip">אימון אחרון ${fmtShort(last.date)}</span>` : ""}</span></button>`;
  }).join("");
  const empty = `<div class="card empty"><h3>עוד אין קבוצות</h3><p>פתחו קבוצה ראשונה, למשל "כיתות א׳–ב׳ יום שלישי", ואז הוסיפו את הילדים.</p><button class="btn ball" data-act="group-new">${ICON.plus} קבוצה חדשה</button></div>`;
  const reminder = !store.isCloud && groups.length ? `<div class="note" style="margin-top:18px">הנתונים נשמרים רק במכשיר הזה. כדאי לגבות מדי פעם בהגדרות.</div>` : "";
  page(hero({ title: `שלום, ${firstName(store.user)}`, sub: groups.length ? "בחרו קבוצה כדי להתחיל אימון" : "בואו נקים את הקבוצה הראשונה" }),
    `<div class="section-title"><h2>הקבוצות שלי</h2>${groups.length ? `<button class="btn small" data-act="group-new">${ICON.plus} קבוצה</button>` : ""}</div>
     ${groups.length ? `<div class="groups">${cards}</div>` : empty}${reminder}`, "groups");
}

function viewGroup(gid, tab = "players") {
  live = true;
  const g = store.get("groups", gid); if (!g) return go("#/");
  const players = playersOf(gid), sessions = sessionsOf(gid);
  const tabs = `<div class="tabs" role="tablist">
    <button role="tab" aria-selected="${tab === "players"}" data-go="#/g/${gid}">ילדים (${players.length})</button>
    <button role="tab" aria-selected="${tab === "sessions"}" data-go="#/g/${gid}/sessions">אימונים (${sessions.length})</button></div>`;
  let body;
  if (tab === "players") {
    const rows = players.map((p) => { const r = rate(p.id, gid);
      return `<button class="row" data-act="player-edit" data-id="${p.id}">${jersey(p.number, groupColor(g))}
        <span class="grow"><div class="name">${esc(p.name)}</div><div class="sub">${r === null ? esc(p.parentName || "") : `הגיע ב-${r}% מהאימונים`}</div></span></button>`; }).join("");
    body = `<button class="btn ball block" data-act="session-new" ${players.length ? "" : "disabled"} style="margin-bottom:16px">אימון חדש</button>
      ${players.length ? `<div class="card">${rows}</div>` : `<div class="card empty"><h3>אין עדיין ילדים בקבוצה</h3><p>הוסיפו את הילדים כדי לסמן נוכחות.</p></div>`}
      <button class="btn ghost block" data-act="player-new" style="margin-top:14px">${ICON.plus} הוספת ילד</button>
      <button class="btn small ghost" data-act="group-edit" style="margin:22px auto 0;display:flex">עריכת פרטי הקבוצה</button>`;
  } else {
    const rows = sessions.map((s) => { const plan = store.get("plans", s.planId);
      return `<button class="row" data-go="#/s/${s.id}"><span class="grow"><div class="name">${fmtDate(s.date)}</div>
        <div class="sub">${presentCount(s)} מתוך ${players.length} ילדים${plan ? " · " + esc(plan.title) : ""}</div></span></button>`; }).join("");
    body = `<button class="btn ball block" data-act="session-new" ${players.length ? "" : "disabled"} style="margin-bottom:16px">אימון חדש</button>
      ${sessions.length ? `<div class="card">${rows}</div>` : `<div class="card empty"><h3>עוד לא היו אימונים</h3><p>לחצו על "אימון חדש" בתחילת האימון הבא.</p></div>`}`;
  }
  page(hero({ title: g.name, sub: [g.ages, g.when, g.place].filter(Boolean).join(" · "), back: "#/", compact: true, tabs }), body, "groups");
}

function viewSession(sid) {
  live = false;
  const s = store.get("sessions", sid); if (!s) return go("#/");
  const g = store.get("groups", s.groupId), players = playersOf(s.groupId), plans = store.all("plans");
  const plan = store.get("plans", s.planId);
  const tiles = players.map((p) => `<button class="tile" data-act="toggle" data-id="${p.id}" aria-pressed="${!!s.attendance?.[p.id]}">
      <span class="tick">${ICON.check}</span>${jersey(p.number, groupColor(g))}<span class="nm">${esc(p.name)}</span></button>`).join("");
  const timeline = plan ? `<div class="section-title"><h2>תוכנית: ${esc(plan.title)}</h2></div><div class="card" style="padding:18px 18px 4px"><div class="timeline">
      ${(plan.drills || []).map((d) => `<div class="step"><div class="t">${esc(d.name)} <span class="chip">${esc(d.minutes || "")} דק׳</span></div>${d.desc ? `<div class="d">${esc(d.desc)}</div>` : ""}</div>`).join("")}</div></div>` : "";
  page(hero({ title: fmtDate(s.date), sub: g?.name, back: `#/g/${s.groupId}`, compact: true }),
    `<div class="card session-head">
      <div class="counter"><b id="cnt">${presentCount(s)}</b><span>מתוך ${players.length} ילדים הגיעו</span></div>
      <div class="bar"><i id="bar" style="width:${players.length ? (presentCount(s) / players.length) * 100 : 0}%"></i></div>
      <div class="two"><div class="field" style="margin:0"><label for="sd">תאריך</label><input id="sd" type="date" value="${s.date}"></div>
      <div class="field" style="margin:0"><label for="sp">תוכנית אימון</label><select id="sp"><option value="">ללא תוכנית</option>${plans.map((p) => `<option value="${p.id}" ${p.id === s.planId ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</select></div></div>
    </div>
    <div class="tiles">${tiles}</div>
    <div class="two" style="margin-top:14px"><button class="btn ghost" data-act="all-on">כולם הגיעו</button><button class="btn ghost" data-act="all-off">איפוס</button></div>
    ${timeline}
    <div class="field" style="margin-top:18px"><label for="sn">הערות לאימון</label><textarea id="sn" placeholder="מה עבד, מה לשפר בפעם הבאה">${esc(s.notes || "")}</textarea></div>
    <button class="btn danger block" data-act="session-del">מחיקת האימון</button>`, "groups");
  const save = debounce(() => store.save("sessions", s), 350);
  dateInput($("#sd"), (v) => { s.date = v; store.save("sessions", s).then(() => viewSession(sid)); });
  $("#sp").onchange = (e) => { s.planId = e.target.value; store.save("sessions", s).then(() => viewSession(sid)); };
  $("#sn").oninput = (e) => { s.notes = e.target.value; save(); };
  app.dataset.sid = sid;
}
function refreshCounter(s) {
  const n = presentCount(s), total = playersOf(s.groupId).length;
  $("#cnt").textContent = n; $("#bar").style.width = (total ? (n / total) * 100 : 0) + "%";
}

/* תוכניות אימון */
function viewPlans() {
  live = true;
  const plans = store.all("plans").slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "he"));
  const rows = plans.map((p) => { const mins = (p.drills || []).reduce((a, d) => a + (+d.minutes || 0), 0);
    return `<button class="row" data-go="#/plan/${p.id}"><span class="grow"><div class="name">${esc(p.title)}</div><div class="sub">${(p.drills || []).length} תרגילים · ${mins} דקות</div></span></button>`; }).join("");
  page(hero({ title: "תוכניות אימון", sub: "תרגילים מוכנים לילדים בגילאי 6–8" }),
    `<div class="section-title"><h2>הספרייה שלי</h2><button class="btn small" data-act="plan-new">${ICON.plus} תוכנית</button></div>
     ${plans.length ? `<div class="card">${rows}</div>` : `<div class="card empty"><h3>הספרייה ריקה</h3><p>אפשר להתחיל מתוכניות מוכנות ולהתאים אותן, או לכתוב תוכנית חדשה.</p></div>`}
     ${plans.length < 3 ? `<button class="btn ghost block" data-act="plan-seed" style="margin-top:14px">הוספת תוכניות לדוגמה</button>` : ""}`, "plans");
}

let draft = null;
function viewPlan(id) {
  live = false;
  draft = draft?.id === id ? draft : structuredClone(store.get("plans", id) || { title: "", drills: [] });
  if (!draft.id && id !== "new") return go("#/plans");
  const total = draft.drills.reduce((a, d) => a + (+d.minutes || 0), 0);
  page(hero({ title: id === "new" ? "תוכנית חדשה" : "עריכת תוכנית", sub: `${draft.drills.length} תרגילים · ${total} דקות`, back: "#/plans", compact: true }),
    `<div class="field"><label for="pt">שם התוכנית</label><input id="pt" value="${esc(draft.title)}" placeholder="למשל: מסירות ושער"></div>
     ${draft.drills.map((d, i) => `<div class="drill" data-i="${i}">
        <div class="drill-head"><input data-f="name" value="${esc(d.name)}" placeholder="שם התרגיל" aria-label="שם התרגיל">
        <input class="minutes" data-f="minutes" type="number" inputmode="numeric" min="1" value="${esc(d.minutes)}" aria-label="דקות" placeholder="דקות"></div>
        <div class="field" style="margin:10px 0 6px"><textarea data-f="desc" placeholder="איך משחקים? מה המטרה?" aria-label="הסבר">${esc(d.desc)}</textarea></div>
        <div style="display:flex;gap:4px;justify-content:flex-end"><button class="icon-btn" data-act="drill-up" aria-label="למעלה">${ICON.up}</button><button class="icon-btn" data-act="drill-down" aria-label="למטה">${ICON.down}</button><button class="icon-btn" data-act="drill-del" aria-label="מחיקה">${ICON.trash}</button></div></div>`).join("")}
     <button class="btn ghost block" data-act="drill-add">${ICON.plus} הוספת תרגיל</button>
     <div class="sheet-actions" style="margin-top:20px"><button class="btn ball block" data-act="plan-save">שמירת התוכנית</button>
     ${draft.id ? `<button class="btn danger block" data-act="plan-del">מחיקת התוכנית</button>` : ""}</div>`, "plans");
}
function syncDraft() {
  if (!draft) return;
  const t = $("#pt"); if (t) draft.title = t.value;
  document.querySelectorAll(".drill").forEach((el) => {
    const d = draft.drills[+el.dataset.i]; if (!d) return;
    el.querySelectorAll("[data-f]").forEach((f) => (d[f.dataset.f] = f.value));
  });
}

/* הגדרות וגיבוי */
function viewSettings() {
  live = true;
  const last = localStorage.getItem("pivot.lastBackup");
  const u = store.user;
  page(hero({ title: "הגדרות", sub: store.isCloud ? u?.email : "מצב מקומי (נתונים במכשיר בלבד)" }),
    `<div class="section-title"><h2>גיבוי</h2></div><div class="card" style="padding:16px">
      <p style="margin-top:0">${store.isCloud ? "הנתונים נשמרים בענן ומסתנכרנים בין הטלפון והמחשב. גיבוי לקובץ הוא ביטוח נוסף." : "הנתונים נשמרים רק במכשיר הזה. גבו לקובץ כדי לא לאבד אותם."}</p>
      <p class="sub" style="color:var(--ink-soft);margin-top:0">${last ? "גיבוי אחרון: " + new Date(+last).toLocaleDateString("he-IL") : "עוד לא בוצע גיבוי לקובץ"}</p>
      <div class="two"><button class="btn" data-act="export">גיבוי לקובץ</button><button class="btn ghost" data-act="import">שחזור מקובץ</button></div>
      <input id="file" type="file" accept="application/json,.json" class="hidden"></div>
     <div class="section-title"><h2>חשבון</h2></div><div class="card" style="padding:16px">
      <div id="install" class="hidden" style="margin-bottom:12px"><button class="btn ball block" data-act="install">התקנה על המסך הראשי</button></div>
      <button class="btn danger block" data-act="signout">${store.isCloud ? "יציאה מהחשבון" : "יציאה מהמצב המקומי"}</button></div>
     <p style="text-align:center;color:var(--ink-soft);font-size:14px;margin-top:20px">פיבוט גרסה ${VERSION}</p>`, "settings");
  if (deferredInstall) $("#install").classList.remove("hidden");
}
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; $("#install")?.classList.remove("hidden"); });

/* ---------- טפסים ---------- */
function groupForm(g = {}) {
  openSheet(`<h2>${g.id ? "פרטי הקבוצה" : "קבוצה חדשה"}</h2>
    <form method="dialog" id="gf">
      <div class="field"><label for="gn">שם הקבוצה</label><input id="gn" required value="${esc(g.name)}" placeholder="למשל: כיתות א׳–ב׳"></div>
      <div class="two"><div class="field"><label for="ga">גילאים</label><input id="ga" value="${esc(g.ages)}" placeholder="6–8"></div>
      <div class="field"><label for="gw">ימים ושעה</label><input id="gw" value="${esc(g.when)}" placeholder="שלישי 17:00"></div></div>
      <div class="field"><label for="gp">מקום</label><input id="gp" value="${esc(g.place)}" placeholder="אולם ספורט"></div>
      <div class="field"><label>צבע הקבוצה</label><div style="display:flex;gap:10px;flex-wrap:wrap" id="cols">${COLORS.map((c) => `<label style="cursor:pointer"><input type="radio" name="c" value="${c}" ${c === (g.color || COLORS[0]) ? "checked" : ""} style="position:absolute;opacity:0"><span style="display:block;width:42px;height:42px;border-radius:50%;background:${c};outline:3px solid transparent" class="sw"></span></label>`).join("")}</div></div>
      <div class="sheet-actions"><button class="btn ball block" value="save">שמירה</button>
      ${g.id ? `<button class="btn danger block" type="button" id="gd">מחיקת הקבוצה</button>` : ""}<button class="btn ghost block" type="button" onclick="document.getElementById('sheet').close()">ביטול</button></div></form>`,
    (root) => {
      const mark = () => root.querySelectorAll(".sw").forEach((sw) => (sw.style.outlineColor = sw.previousElementSibling.checked ? "#10243d" : "transparent"));
      root.querySelectorAll('input[name="c"]').forEach((r) => r.addEventListener("change", mark)); mark();
      $("#gf").onsubmit = async () => {
        const o = { ...g, name: $("#gn").value.trim(), ages: $("#ga").value.trim(), when: $("#gw").value.trim(), place: $("#gp").value.trim(), color: root.querySelector('input[name="c"]:checked').value, createdAt: g.createdAt || Date.now() };
        const saved = await store.save("groups", o); if (!g.id) go("#/g/" + saved.id);
      };
      $("#gd")?.addEventListener("click", async () => {
        if (!confirm(`למחוק את "${g.name}" יחד עם כל הילדים והאימונים שלה? אי אפשר לבטל.`)) return;
        closeSheet(); await store.removeGroup(g.id); go("#/");
      });
    });
}

function playerForm(gid, p = {}) {
  const phone = p.parentPhone;
  openSheet(`<h2>${p.id ? esc(p.name) : "ילד חדש"}</h2>
    ${phone ? `<div class="contact"><a class="btn small" href="tel:${esc(phone)}">התקשרות להורה</a><a class="btn small ghost" target="_blank" rel="noopener" href="${waLink(phone)}">וואטסאפ</a></div>` : ""}
    <form method="dialog" id="pf">
      <div class="two" style="grid-template-columns:2fr 1fr"><div class="field"><label for="pn">שם מלא</label><input id="pn" required value="${esc(p.name)}"></div>
      <div class="field"><label for="pm">מספר חולצה</label><input id="pm" type="number" inputmode="numeric" min="0" max="99" value="${esc(p.number)}"></div></div>
      <div class="field"><label for="pb">תאריך לידה</label><input id="pb" type="date" value="${esc(p.birth)}"></div>
      <div class="two"><div class="field"><label for="pr">שם ההורה</label><input id="pr" value="${esc(p.parentName)}"></div>
      <div class="field"><label for="pp">טלפון ההורה</label><input id="pp" type="tel" inputmode="tel" value="${esc(p.parentPhone)}" placeholder="050-0000000"></div></div>
      <div class="field"><label for="ph">בריאות ורגישויות</label><textarea id="ph" placeholder="אסתמה, אלרגיה, תרופות">${esc(p.health)}</textarea></div>
      <div class="field"><label for="pt2">הערות מאמן</label><textarea id="pt2" placeholder="חוזקות, מה לחזק, התקדמות">${esc(p.notes)}</textarea></div>
      <div class="sheet-actions"><button class="btn ball block" value="save">שמירה</button>
      ${p.id ? `<button class="btn danger block" type="button" id="pd">הסרת הילד מהקבוצה</button>` : ""}<button class="btn ghost block" type="button" onclick="document.getElementById('sheet').close()">ביטול</button></div></form>`,
    () => {
      $("#pf").onsubmit = () => store.save("players", { ...p, groupId: gid, name: $("#pn").value.trim(), number: $("#pm").value, birth: $("#pb").value, parentName: $("#pr").value.trim(), parentPhone: $("#pp").value.trim(), health: $("#ph").value.trim(), notes: $("#pt2").value.trim(), createdAt: p.createdAt || Date.now() });
      $("#pd")?.addEventListener("click", async () => {
        if (!confirm(`להסיר את ${p.name}? נוכחות עבר תישמר באימונים.`)) return;
        closeSheet(); await store.remove("players", p.id);
      });
    });
}

/* ---------- ניתוב ---------- */
function go(h) { if (location.hash === h) route(); else location.hash = h; }
let ready = false;
function route() {
  if (!ready) return;
  if (!store.user) return viewLogin();
  const [, a, b, c] = (location.hash || "#/").split("/");
  const y = window.scrollY;
  if (a === "g" && b) viewGroup(b, c === "sessions" ? "sessions" : "players");
  else if (a === "s" && b) viewSession(b);
  else if (a === "plans") viewPlans();
  else if (a === "plan" && b) viewPlan(b);
  else if (a === "settings") viewSettings();
  else viewHome();
  if (a !== "s" && a !== "plan") window.scrollTo(0, y);
  else if (!route.keep) window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => { draft = null; route.keep = false; route(); window.scrollTo(0, 0); });

let pending;
store.onChange(() => { if (live && ready && store.user) { cancelAnimationFrame(pending); pending = requestAnimationFrame(route); } });

/* ---------- פעולות ---------- */
const curGid = () => (location.hash.split("/")[1] === "g" ? location.hash.split("/")[2] : null);
const curSession = () => store.get("sessions", location.hash.split("/")[2]);
const actions = {
  signin: () => store.signIn().catch((e) => toast("ההתחברות נכשלה: " + (e.code || e.message))),
  signout: () => confirm("לצאת מהחשבון?") && store.signOut(),
  "group-new": () => groupForm(),
  "group-edit": () => groupForm(store.get("groups", curGid())),
  "player-new": () => playerForm(curGid()),
  "player-edit": (el) => playerForm(curGid(), store.get("players", el.dataset.id)),
  "session-new": async () => {
    const gid = curGid(), today = todayStr();
    const ex = sessionsOf(gid).find((s) => s.date === today);
    if (ex) return go("#/s/" + ex.id);
    const s = await store.save("sessions", { groupId: gid, date: today, attendance: {}, planId: "", notes: "" });
    go("#/s/" + s.id);
  },
  toggle: (el) => {
    const s = curSession(); s.attendance = s.attendance || {};
    const on = !s.attendance[el.dataset.id]; s.attendance[el.dataset.id] = on;
    el.setAttribute("aria-pressed", on); refreshCounter(s); store.save("sessions", s);
  },
  "all-on": () => { const s = curSession(); s.attendance = Object.fromEntries(playersOf(s.groupId).map((p) => [p.id, true])); store.save("sessions", s).then(() => { route.keep = true; viewSession(s.id); }); },
  "all-off": () => { const s = curSession(); s.attendance = {}; store.save("sessions", s).then(() => { route.keep = true; viewSession(s.id); }); },
  "session-del": async () => { const s = curSession(); if (!confirm("למחוק את האימון הזה?")) return; await store.remove("sessions", s.id); go("#/g/" + s.groupId); },
  "plan-new": () => { draft = null; location.hash = "#/plan/new"; },
  "plan-seed": async () => { const have = new Set(store.all("plans").map((p) => p.title)); for (const p of SEED_PLANS) if (!have.has(p.title)) await store.save("plans", structuredClone(p)); toast("נוספו תוכניות לדוגמה"); },
  "drill-add": () => { syncDraft(); draft.drills.push({ name: "", minutes: 10, desc: "" }); viewPlan(draft.id || "new"); },
  "drill-del": (el) => { syncDraft(); draft.drills.splice(+el.closest(".drill").dataset.i, 1); viewPlan(draft.id || "new"); },
  "drill-up": (el) => moveDrill(el, -1),
  "drill-down": (el) => moveDrill(el, 1),
  "plan-save": async () => {
    syncDraft(); if (!draft.title.trim()) return toast("נא לתת שם לתוכנית");
    draft.drills = draft.drills.filter((d) => d.name.trim());
    await store.save("plans", draft); draft = null; toast("התוכנית נשמרה"); go("#/plans");
  },
  "plan-del": async () => { if (!confirm("למחוק את התוכנית?")) return; await store.remove("plans", draft.id); draft = null; go("#/plans"); },
  export: () => {
    const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `pivot-backup-${todayStr()}.json` });
    a.click(); URL.revokeObjectURL(a.href); localStorage.setItem("pivot.lastBackup", Date.now()); toast("הגיבוי הורד"); viewSettings();
  },
  import: () => $("#file").click(),
  install: async () => { deferredInstall?.prompt(); deferredInstall = null; }
};
function moveDrill(el, d) {
  syncDraft(); const i = +el.closest(".drill").dataset.i, j = i + d;
  if (j < 0 || j >= draft.drills.length) return;
  [draft.drills[i], draft.drills[j]] = [draft.drills[j], draft.drills[i]]; viewPlan(draft.id || "new");
}

document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-go]"); if (g) return go(g.dataset.go);
  const a = e.target.closest("[data-act]"); if (a) actions[a.dataset.act]?.(a);
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "file" || !e.target.files[0]) return;
  try {
    await store.importAll(JSON.parse(await e.target.files[0].text())); toast("הנתונים שוחזרו");
  } catch (err) { toast(err.message || "הקובץ לא תקין"); }
});

/* ---------- הפעלה ---------- */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
store.start(() => { ready = true; route(); }).catch((e) => { app.innerHTML = `<div class="login"><h1>אופס</h1><p>לא הצלחנו לטעון. בדקו חיבור לאינטרנט ורעננו.</p><small>${esc(e.message)}</small></div>`; });
