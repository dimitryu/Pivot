// יכולות עזר בזמן אימון: שעון, חלוקה לקבוצות, שיתוף הודעות, הדפסה, יומן, הערכות, תגיות ומשחקים.
import { store } from "./store.js";
import {
  $, esc, ICON, STAGES, FOCUS, TEAM_COLORS, BADGES, GEAR, MATCH_KINDS, avatar, fmtDate, monthLabel, todayStr, scheduleOf,
  DAY_SHORT, avgOf, buildIcs, downloadText, icsStamp, toast, openSheet, closeSheet
} from "./lib.js";

/* ---------- שעון אימון ---------- */
export const stepsOf = (plan) => STAGES.flatMap((s) => (plan?.stages?.[s.k] || []).map((d) => ({ stageLabel: s.label, color: s.color, name: d.name, minutes: Math.max(1, +d.minutes || 5), desc: d.desc || "" })));

let ac;
function beep(freq = 880, ms = 220, when = 0) {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + when;
    o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.start(t); o.stop(t + ms / 1000 + 0.05);
  } catch { /* אין אודיו */ }
}
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function runTimer(steps) {
  if (!steps.length) return toast("אין תרגילים בתוכנית");
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); } catch { /* ללא אודיו */ }
  let i = 0, left = steps[0].minutes * 60, endAt = Date.now() + left * 1000, running = true, done = false, warned = false, wake = null;
  const el = document.createElement("div"); el.className = "timer"; document.body.appendChild(el);
  const lock = async () => { try { wake = await navigator.wakeLock?.request("screen"); } catch { /* לא נתמך */ } };
  lock(); const vis = () => { if (document.visibilityState === "visible" && running) lock(); }; document.addEventListener("visibilitychange", vis);

  const render = () => {
    if (done) { el.style.setProperty("--tc", "#1fa971"); el.innerHTML = `<div class="tm-top"><button class="tm-x" data-t="close" aria-label="סגירה">${ICON.x}</button></div><div class="tm-mid"><h2>האימון הסתיים</h2><p>כל הכבוד לכולם!</p></div><div class="tm-ctl"><button class="btn block" data-t="close">סגירה</button></div>`; return; }
    const st = steps[i], next = steps[i + 1];
    el.style.setProperty("--tc", st.color);
    el.innerHTML = `<div class="tm-top"><button class="tm-x" data-t="close" aria-label="סגירה">${ICON.x}</button><span class="tm-stage">${esc(st.stageLabel)} · ${i + 1} מתוך ${steps.length}</span></div>
      <div class="tm-mid"><div class="tm-time" id="tmTime">${mmss(left)}</div><h2>${esc(st.name)}</h2>${st.desc ? `<p>${esc(st.desc)}</p>` : ""}
      <div class="tm-bar">${steps.map((_, k) => `<i class="${k < i ? "d" : k === i ? "c" : ""}"></i>`).join("")}</div>
      <div class="tm-next">${next ? `הבא: ${esc(next.name)} (${next.minutes} דק׳)` : "זה התרגיל האחרון"}</div></div>
      <div class="tm-ctl"><button class="tm-b" data-t="prev" aria-label="הקודם" style="transform:scaleX(-1)">${ICON.skip}</button>
      <button class="tm-b big" data-t="toggle" aria-label="${running ? "עצירה" : "המשך"}">${running ? ICON.pause : ICON.play}</button>
      <button class="tm-b" data-t="next" aria-label="הבא">${ICON.skip}</button></div>
      <button class="tm-plus" data-t="plus">+1 דקה</button>`;
  };
  const go = (n) => { i = n; left = steps[i].minutes * 60; endAt = Date.now() + left * 1000; warned = false; render(); };
  const finishStep = () => {
    beep(880, 250); beep(880, 250, .35); beep(1175, 500, .7); navigator.vibrate?.([250, 120, 250, 120, 500]);
    if (i + 1 >= steps.length) { done = true; running = false; render(); } else go(i + 1);
  };
  const tick = setInterval(() => {
    if (!running || done) return;
    left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    const t = $("#tmTime", el); if (t) t.textContent = mmss(left);
    if (left === 10 && !warned) { warned = true; beep(660, 150); }
    if (left <= 0) finishStep();
  }, 250);
  const close = () => { clearInterval(tick); document.removeEventListener("visibilitychange", vis); wake?.release?.(); el.remove(); };
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]"); if (!b) return; const a = b.dataset.t;
    if (a === "close") return (done || confirm("לסגור את השעון?")) && close();
    if (a === "toggle") { running = !running; if (running) endAt = Date.now() + left * 1000; render(); }
    if (a === "next") i + 1 < steps.length ? go(i + 1) : finishStep();
    if (a === "prev") go(Math.max(0, i - 1));
    if (a === "plus") { left += 60; endAt += 60 * 1000; render(); }
  });
  render();
}

export function quickTimerSheet() {
  openSheet(`<h2>טיימר מהיר</h2><div class="days">${[1, 2, 3, 5, 8, 10].map((m) => `<button class="btn ghost small" data-q="${m}">${m} דק׳</button>`).join("")}</div>
    <div class="field" style="margin-top:14px"><label for="qm">או כמה דקות?</label><input id="qm" type="number" inputmode="numeric" min="1" max="90" placeholder="למשל 4"></div>
    <div class="sheet-actions"><button class="btn ball block" id="qgo">התחלה</button><button class="btn ghost block" data-close>סגירה</button></div>`,
  (root) => {
    const start = (m) => { if (!m) return; closeSheet(); runTimer([{ stageLabel: "טיימר מהיר", color: "#1f57e0", name: `${m} דקות`, minutes: m, desc: "" }]); };
    root.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => start(+b.dataset.q)));
    $("#qgo").addEventListener("click", () => start(+$("#qm").value));
  });
}

/* ---------- הערכות כישורים ---------- */
export const assessmentsOf = (pid) => store.all("assessments").filter((a) => a.playerId === pid).sort((a, b) => a.date.localeCompare(b.date) || (a.updatedAt || 0) - (b.updatedAt || 0));
export const latestSkills = (pid) => assessmentsOf(pid).at(-1)?.skills || null;

export function assessSheet(player, onSaved) {
  const last = latestSkills(player.id) || {}, vals = { ...last };
  const row = (k) => `<div class="srow" data-k="${k}"><span>${FOCUS[k]}</span><span class="stars">${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-v="${v}" aria-label="${v}">${ICON.star}</button>`).join("")}</span></div>`;
  openSheet(`<h2>הערכת כישורים: ${esc(player.name)}</h2><p class="sub" style="margin-top:-8px;color:var(--ink-soft)">1 = מתחיל, 5 = מצטיין. ההערכה נשמרת עם תאריך כדי לראות התקדמות.</p>
    <div id="sr">${Object.keys(FOCUS).map(row).join("")}</div>
    <div class="sheet-actions sticky"><button class="btn ball block" id="asv">שמירת הערכה</button><button class="btn ghost block" data-close>ביטול</button></div>`,
  (root) => {
    const paint = () => root.querySelectorAll(".srow").forEach((r) => r.querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.v <= (vals[r.dataset.k] || 0))));
    root.querySelectorAll(".srow button").forEach((b) => b.addEventListener("click", () => { vals[b.closest(".srow").dataset.k] = +b.dataset.v; paint(); })); paint();
    $("#asv").addEventListener("click", async () => {
      if (!Object.keys(vals).length) return toast("דרגו לפחות כישור אחד");
      await store.save("assessments", { playerId: player.id, groupId: player.groupId, date: todayStr(), skills: vals }); closeSheet(); toast("ההערכה נשמרה"); onSaved?.();
    });
  });
}

/* ---------- תגי הצלחה ---------- */
export const badgeDot = (type, size = 28) => `<span class="bdg" style="--bc:${BADGES[type]?.color || "#888"};width:${size}px;height:${size}px">${ICON.medal}</span>`;
export function badgeSheet(player, onSaved) {
  openSheet(`<h2>הענקת תגית ל${esc(player.name)}</h2><form id="bf">
    <div class="pickgrid">${Object.entries(BADGES).map(([k, b], i) => `<label class="pick"><input type="radio" name="b" value="${k}" ${i === 0 ? "checked" : ""}><span>${badgeDot(k)}<b>${b.label}</b></span></label>`).join("")}</div>
    <div class="field" style="margin-top:14px"><label for="bn">למה? (לא חובה)</label><input id="bn" placeholder="למשל: עזר לחבר שנפל"></div>
    <div class="sheet-actions sticky"><button class="btn ball block" type="submit">הענקה</button><button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
  () => $("#bf").addEventListener("submit", async (e) => { e.preventDefault();
    await store.save("badges", { playerId: player.id, groupId: player.groupId, type: $("#bf input:checked").value, date: todayStr(), note: $("#bn").value.trim() }); closeSheet(); toast("התגית הוענקה"); onSaved?.(); }));
}

/* ---------- חלוקה לקבוצות ---------- */
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function teamsSheet(players, color) {
  let n = 2, balanced = true, teams = [];
  const known = players.map((p) => avgOf(latestSkills(p.id))).filter(Boolean), mean = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 3;
  const score = (p) => avgOf(latestSkills(p.id)) || mean;
  const hasScores = known.length >= Math.ceil(players.length / 2);
  const deal = () => {
    teams = Array.from({ length: n }, () => []);
    const order = shuffle(players);
    if (balanced && hasScores) { order.sort((a, b) => score(b) - score(a)); order.forEach((p, i) => { const r = Math.floor(i / n); teams[r % 2 === 0 ? i % n : n - 1 - (i % n)].push(p); }); }
    else order.forEach((p, i) => teams[i % n].push(p));
  };
  const text = () => teams.map((t, i) => `${TEAM_COLORS[i][1]}: ${t.map((p) => p.name).join(", ")}`).join("\n");
  const paint = () => {
    $("#tmBody").innerHTML = `<div class="seg" style="margin-bottom:10px">${[2, 3, 4].map((k) => `<button data-n="${k}" aria-pressed="${n === k}">${k} קבוצות</button>`).join("")}</div>
      ${hasScores ? `<label class="chk"><input type="checkbox" id="tmBal" ${balanced ? "checked" : ""}> איזון לפי הערכות הכישורים</label>` : `<p class="sub" style="color:var(--ink-soft)">הוסיפו הערכות כישורים בפרופיל הילדים כדי לקבל חלוקה מאוזנת.</p>`}
      <div class="teams">${teams.map((t, i) => `<section class="team" style="--tc:${TEAM_COLORS[i][0]}"><h3>${TEAM_COLORS[i][1]} <small>${t.length} ילדים${balanced && hasScores ? ` · רמה ${(t.reduce((a, p) => a + score(p), 0) / (t.length || 1)).toFixed(1)}` : ""}</small></h3>
        ${t.map((p) => `<div class="tp">${avatar(p, color)}<b>${esc(p.name)}</b></div>`).join("")}</section>`).join("")}</div>`;
    $("#tmBody").querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => { n = +b.dataset.n; deal(); paint(); }));
    $("#tmBal")?.addEventListener("change", (e) => { balanced = e.target.checked; deal(); paint(); });
  };
  if (players.length < 2) return toast("צריך לפחות שני ילדים");
  openSheet(`<h2>חלוקה לקבוצות</h2><div id="tmBody"></div><div class="sheet-actions cols sticky"><button class="btn ball" id="tmAgain">ערבוב מחדש</button><button class="btn ghost" id="tmCopy">העתקה</button></div><button class="btn ghost block" data-close style="margin-top:10px">סגירה</button>`,
    () => { deal(); paint(); $("#tmAgain").onclick = () => { deal(); paint(); }; $("#tmCopy").onclick = () => navigator.clipboard?.writeText(text()).then(() => toast("הועתק"), () => toast("אי אפשר להעתיק")); });
}

/* ---------- הודעות להורים ---------- */
export function shareSheet(title, text) {
  openSheet(`<h2>${esc(title)}</h2><div class="field"><label for="shtxt">אפשר לערוך את ההודעה לפני השליחה</label><textarea id="shtxt" rows="9">${esc(text)}</textarea></div>
    <div class="sheet-actions sticky"><button class="btn ball block" id="shwa">שליחה בווטסאפ</button>
    <div class="two"><button class="btn ghost" id="shnat">${ICON.share} שיתוף</button><button class="btn ghost" id="shcp">העתקה</button></div><button class="btn ghost block" data-close>סגירה</button></div>`,
  () => {
    const t = () => $("#shtxt").value;
    $("#shwa").onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(t()), "_blank", "noopener");
    $("#shnat").onclick = () => (navigator.share ? navigator.share({ text: t() }).catch(() => {}) : toast("השיתוף לא נתמך במכשיר הזה"));
    $("#shcp").onclick = () => navigator.clipboard?.writeText(t()).then(() => toast("הועתק"), () => toast("אי אפשר להעתיק"));
  });
}
export function sessionMessage(g, s, plan) {
  const n = Object.values(s.attendance || {}).filter(Boolean).length;
  const names = [...new Set(Object.values(plan?.stages || {}).flat().map((d) => d.name))];
  const sched = scheduleOf(g).slice().sort((a, b) => a.day - b.day);
  const nextDay = sched.find((x) => x.day > new Date(s.date + "T12:00:00").getDay()) || sched[0];
  return `שלום הורים יקרים 🤾\nסיכום האימון של ${g.name}, ${fmtDate(s.date)}:\nהגיעו ${n} ילדים והיה כיף.${names.length ? `\nעבדנו על: ${names.join(", ")}.` : ""}\n${nextDay ? `נתראה באימון הבא ביום ${DAY_SHORT[nextDay.day]}${nextDay.time ? " ב-" + nextDay.time : ""}.` : "נתראה באימון הבא."}\nתודה על התמיכה!`;
}
export const starMessage = (g, p, month, note) => `מצטיין החודש ל${monthLabel(month)} בקבוצת ${g.name}: ${p.name}! ⭐\n${note ? note + "\n" : ""}כל הכבוד, ותודה להורים על התמיכה.`;
export function matchMessage(g, m) {
  return `שלום הורים 🤾\nמשחק ${MATCH_KINDS[m.kind] || ""} של ${g.name}:\n${fmtDate(m.date)}${m.time ? " בשעה " + m.time : ""}${m.opponent ? `\nנגד: ${m.opponent}` : ""}${m.place ? `\nמקום: ${m.place}` : ""}\nנא להגיע 15 דקות לפני, עם בקבוק מים וחולצה.\nמחכים לראות את כולם!`;
}

/* ---------- הדפסת מערך ---------- */
export function printPlan({ group, date, present, plan, notes }) {
  const total = STAGES.reduce((a, s) => a + (plan.stages[s.k] || []).reduce((x, d) => x + (+d.minutes || 0), 0), 0);
  let area = $("#printArea"); if (!area) { area = document.createElement("div"); area.id = "printArea"; document.body.appendChild(area); }
  area.innerHTML = `<h1>${esc(plan.title)}</h1><p class="pm">${esc(group?.name || "")} · ${fmtDate(date)}${present ? ` · ${present} ילדים` : ""} · ${total} דקות</p>
    ${plan.summary ? `<p>${esc(plan.summary)}</p>` : ""}
    ${STAGES.map((s) => { const list = plan.stages[s.k] || []; return list.length ? `<h2 style="border-color:${s.color};color:${s.color}">${s.label}</h2>${list.map((d) => `<div class="pd"><b>${esc(d.name)}</b> <span>${d.minutes} דק׳</span>${d.desc ? `<div>${esc(d.desc)}</div>` : ""}</div>`).join("")}` : ""; }).join("")}
    ${plan.tips?.length ? `<h2>טיפים</h2><ul>${plan.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
    <h2>הערות</h2><div class="pn">${esc(notes || "")}</div>`;
  document.body.classList.add("printing");
  setTimeout(() => window.print(), 80);
}
window.addEventListener("afterprint", () => document.body.classList.remove("printing"));

/* ---------- יומן (ics) ---------- */
export function exportGroupIcs(g) {
  const sched = scheduleOf(g); if (!sched.length) return toast("קודם הגדירו ימי אימון בפרטי הקבוצה");
  const BY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"], now = new Date();
  const events = sched.map((x) => { const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + ((x.day - d.getDay() + 7) % 7));
    return { uid: `${g.id}-${x.day}`, start: icsStamp(d, x.time || "17:00"), minutes: 60, rrule: `FREQ=WEEKLY;BYDAY=${BY[x.day]}`, title: `אימון כדור יד: ${g.name}`, place: g.place, alarm: 60 }; });
  downloadText(`pivot-${g.name}.ics`, buildIcs(events), "text/calendar"); toast("הקובץ הורד. פתחו אותו כדי להוסיף ליומן עם תזכורת");
}
export function exportMatchIcs(g, m) {
  const d = new Date(m.date + "T12:00:00");
  downloadText(`pivot-match-${m.date}.ics`, buildIcs([{ uid: m.id, start: icsStamp(d, m.time || "17:00"), minutes: 90, title: `משחק: ${g.name}${m.opponent ? " נגד " + m.opponent : ""}`, place: m.place, alarm: 120 }]), "text/calendar");
  toast("הקובץ הורד. פתחו אותו כדי להוסיף ליומן");
}

/* ---------- משחקים ---------- */
export function matchResult(m) {
  if (m.ourScore === "" || m.ourScore == null || m.theirScore === "" || m.theirScore == null) return null;
  const a = +m.ourScore, b = +m.theirScore; return a > b ? "win" : a < b ? "loss" : "draw";
}
export const RESULT_LABEL = { win: "ניצחון", draw: "תיקו", loss: "הפסד" };
export function matchForm(g, m = {}, onShare) {
  const gear = { ...(m.gear || {}) };
  openSheet(`<h2>${m.id ? "פרטי המשחק" : "משחק חדש"}</h2><form id="mf">
    <div class="two"><div class="field"><label for="mk">סוג</label><select id="mk">${Object.entries(MATCH_KINDS).map(([k, v]) => `<option value="${k}" ${(m.kind || "friendly") === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
    <div class="field"><label for="md">תאריך</label><input id="md" type="date" required value="${esc(m.date || todayStr())}"></div></div>
    <div class="two"><div class="field"><label for="mt">שעה</label><input id="mt" type="time" value="${esc(m.time)}"></div><div class="field"><label for="mo">נגד מי</label><input id="mo" value="${esc(m.opponent)}" placeholder="שם הקבוצה"></div></div>
    <div class="field"><label for="mp">מקום</label><input id="mp" value="${esc(m.place)}"></div>
    <div class="two"><div class="field"><label for="ms1">התוצאה שלנו</label><input id="ms1" type="number" inputmode="numeric" min="0" value="${esc(m.ourScore ?? "")}"></div><div class="field"><label for="ms2">התוצאה שלהם</label><input id="ms2" type="number" inputmode="numeric" min="0" value="${esc(m.theirScore ?? "")}"></div></div>
    <div class="field"><label>ציוד למשחק</label><div class="gear">${GEAR.map((x) => `<label class="chk"><input type="checkbox" data-g="${esc(x)}" ${gear[x] ? "checked" : ""}> ${x}</label>`).join("")}</div></div>
    <div class="field"><label for="mn">הערות</label><textarea id="mn" rows="3">${esc(m.notes)}</textarea></div>
    <div class="sheet-actions sticky"><button class="btn ball block" type="submit">שמירה</button>
    ${m.id ? `<div class="two"><button class="btn ghost" type="button" id="mshare">${ICON.share} הודעה להורים</button><button class="btn ghost" type="button" id="mcal">${ICON.cal} ליומן</button></div><button class="btn danger block" type="button" id="mdel">מחיקת המשחק</button>` : ""}
    <button class="btn ghost block" type="button" data-close>סגירה</button></div></form>`,
  (root) => {
    const read = () => ({ ...m, groupId: g.id, kind: $("#mk").value, date: $("#md").value, time: $("#mt").value, opponent: $("#mo").value.trim(), place: $("#mp").value.trim(),
      ourScore: $("#ms1").value, theirScore: $("#ms2").value, notes: $("#mn").value.trim(), gear: Object.fromEntries([...root.querySelectorAll("[data-g]")].map((c) => [c.dataset.g, c.checked])) });
    $("#mf").addEventListener("submit", async (e) => { e.preventDefault(); await store.save("matches", read()); closeSheet(); toast("המשחק נשמר"); });
    $("#mshare")?.addEventListener("click", () => { const mm = read(); closeSheet(); onShare(mm); });
    $("#mcal")?.addEventListener("click", () => exportMatchIcs(g, read()));
    $("#mdel")?.addEventListener("click", async () => { if (confirm("למחוק את המשחק?")) { await store.remove("matches", m.id); closeSheet(); } });
  });
}
