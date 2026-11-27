// סטטיסטיקות לקבוצה לפי תקופה: נוכחות, מגמה חודשית, ימי שבוע, תרגילים, תחומים ומצטיינים.
import { store } from "./store.js";
import { esc, ICON, FOCUS, STAGES, STAGE, monthKey, monthLabel, weekdayOf, DAY_SHORT, todayStr } from "./lib.js";

export const PERIODS = [["all", "כל הזמן"], ["month", "החודש"], ["90", "3 חודשים"], ["30", "30 ימים"]];

function cutoff(period) {
  const d = new Date();
  if (period === "month") return todayStr().slice(0, 7) + "-01";
  if (period === "30" || period === "90") { d.setDate(d.getDate() - +period); return d.toISOString().slice(0, 10); }
  return "";
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const bar = (label, pct, text, color = "var(--floor)") =>
  `<div class="hbar"><span class="lb">${label}</span><span class="trk"><i style="width:${Math.max(2, Math.min(100, pct))}%;background:${color}"></i></span><b>${text}</b></div>`;

export function renderStats(gid, period) {
  const from = cutoff(period);
  const players = store.all("players").filter((p) => p.groupId === gid);
  const all = store.all("sessions").filter((s) => s.groupId === gid && (!from || s.date >= from)).sort((a, b) => b.date.localeCompare(a.date));
  const chips = `<div class="seg">${PERIODS.map(([k, l]) => `<button data-act="period" data-p="${k}" aria-pressed="${period === k}">${l}</button>`).join("")}</div>`;
  if (!all.length) return chips + `<div class="card empty"><h3>אין עדיין נתונים</h3><p>הסטטיסטיקות יופיעו אחרי האימון הראשון בתקופה הזו.</p></div>`;

  const total = (s) => s.total || players.length || 1;
  const pct = (s) => (presentOf(s) / total(s)) * 100;
  const presentOf = (s) => Object.values(s.attendance || {}).filter(Boolean).length;
  const avgPresent = avg(all.map(presentOf)), avgPct = avg(all.map(pct));
  const best = all.slice().sort((a, b) => presentOf(b) - presentOf(a))[0];

  // נוכחות לפי ילד
  const byChild = players.map((p) => ({ p, n: all.filter((s) => s.attendance?.[p.id]).length })).sort((a, b) => b.n - a.n);
  const recent3 = all.slice(0, 3);
  const missing = all.length >= 3 ? players.filter((p) => recent3.every((s) => !s.attendance?.[p.id])) : [];

  // מגמה חודשית
  const months = {};
  all.forEach((s) => (months[monthKey(s.date)] ||= []).push(pct(s)));
  const monthRows = Object.keys(months).sort().slice(-8);
  const maxM = 100;
  const trend = monthRows.map((m) => `<div class="col"><b>${Math.round(avg(months[m]))}%</b><span class="stick"><i style="height:${(avg(months[m]) / maxM) * 100}%"></i></span><small>${monthLabel(m).split(" ")[0]}</small></div>`).join("");

  // ימי שבוע
  const wd = {};
  all.forEach((s) => (wd[weekdayOf(s.date)] ||= []).push(presentOf(s)));
  const wdMax = Math.max(...Object.values(wd).map(avg), 1);
  const wdRows = Object.keys(wd).sort().map((d) => bar("יום " + DAY_SHORT[d], (avg(wd[d]) / wdMax) * 100, avg(wd[d]).toFixed(1).replace(".0", ""), "var(--ball)")).join("");

  // תרגילים ותחומים
  const drillCount = {}, focusCount = {}, stageCount = {}, modes = { mine: 0, random: 0, smart: 0, ai: 0, none: 0 };
  all.forEach((s) => {
    if (!s.plan) return void modes.none++;
    modes[s.plan.mode || "mine"]++;
    for (const [k, list] of Object.entries(s.plan.stages || {})) list.forEach((d) => {
      drillCount[d.name] = (drillCount[d.name] || 0) + 1;
      if (d.focus) focusCount[d.focus] = (focusCount[d.focus] || 0) + 1;
      stageCount[k] = (stageCount[k] || 0) + 1;
    });
  });
  const topDrills = Object.entries(drillCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const focusRows = Object.entries(focusCount).sort((a, b) => b[1] - a[1]);
  const fMax = Math.max(...Object.values(focusCount), 1);
  const planned = all.length - modes.none;

  // מצטיינים
  const awards = store.all("awards").filter((a) => a.groupId === gid && (!from || a.month >= from.slice(0, 7)));
  const starCount = {};
  awards.forEach((a) => (starCount[a.playerId] = (starCount[a.playerId] || 0) + 1));
  const stars = Object.entries(starCount).sort((a, b) => b[1] - a[1]).map(([id, n]) => [players.find((p) => p.id === id)?.name, n]).filter(([nm]) => nm);

  const closed = new Set(JSON.parse(localStorage.getItem("pivot.stat.closed") || "[]"));
  const card = (title, body) => `<section class="card statcard fold-card${closed.has(title) ? " closed" : ""}" data-k="${esc(title)}"><button class="sfold" data-act="stat-fold" aria-label="פתיחה או סגירה">${title}${ICON.chev}</button><div class="sbody">${body}</div></section>`;
  const monthKeyNow = todayStr().slice(0, 7), thisMonth = store.all("sessions").filter((x) => x.groupId === gid && x.date.startsWith(monthKeyNow));
  const monthKids = thisMonth.reduce((a, x) => a + presentOf(x), 0);
  const pay = card("חישוב תשלום למאמן לחודש", `<div class="kpis" style="margin:0 0 8px"><div class="kpi"><b>${thisMonth.length}</b><span>אימונים החודש</span></div><div class="kpi"><b>${monthKids}</b><span>הגעות ילדים</span></div></div>
    <p class="sub" style="margin:0">${esc(monthLabel(monthKeyNow))}. נוסחת התשלום תתווסף בהמשך.</p>`);
  return chips + `<div class="foldall"><button class="btn small ghost" data-act="stat-all" data-v="open">פתיחת הכול</button><button class="btn small ghost" data-act="stat-all" data-v="close">סגירת הכול</button></div>
    <div class="kpis"><div class="kpi"><b>${all.length}</b><span>אימונים</span></div>
      <div class="kpi"><b>${avgPresent.toFixed(1).replace(".0", "")}</b><span>ילדים בממוצע</span></div>
      <div class="kpi"><b>${Math.round(avgPct)}%</b><span>נוכחות</span></div></div>
    ${best ? `<p class="note">האימון הכי מלא: ${presentOf(best)} ילדים, ${new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" }).format(new Date(best.date + "T12:00:00"))}.</p>` : ""}
    ${missing.length ? card("חסרים ב-3 האימונים האחרונים", `<p class="sub" style="margin:0 0 6px">שווה ליצור קשר עם ההורים:</p>${missing.map((p) => `<span class="chip warn">${esc(p.name)}</span> `).join("")}`) : ""}
    ${card("נוכחות לפי ילד", byChild.map(({ p, n }) => bar(esc(p.name), (n / all.length) * 100, `${n}/${all.length}`)).join(""))}
    ${monthRows.length > 1 ? card("מגמה לפי חודשים", `<div class="trend">${trend}</div>`) : ""}
    ${card("נוכחות לפי יום בשבוע", wdRows)}
    ${planned ? card("תחומים שתורגלו", focusRows.map(([k, n]) => bar(FOCUS[k] || k, (n / fMax) * 100, n, "var(--win)")).join("")) : ""}
    ${planned ? card("תרגילים נפוצים", topDrills.map(([nm, n]) => bar(esc(nm), (n / topDrills[0][1]) * 100, n + "×", "var(--floor-deep)")).join("")) : ""}
    ${card("איך נבנו האימונים", `<div class="modes">
      <span class="chip">התוכנית שלי: ${modes.mine}</span><span class="chip">הגרלה: ${modes.random}</span>
      ${modes.smart ? `<span class="chip">הצעה חכמה: ${modes.smart}</span>` : ""}<span class="chip">עוזר AI: ${modes.ai}</span><span class="chip">בלי תוכנית: ${modes.none}</span></div>`)}
    ${stars.length ? card("מצטייני החודש", stars.map(([nm, n]) => bar(esc(nm), 100, "⭐".repeat(Math.min(n, 5)) + (n > 5 ? ` ${n}` : ""), "#f2a900")).join("")) : ""}
    ${pay}`;
}
