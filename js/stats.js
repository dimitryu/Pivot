// סטטיסטיקות לקבוצה לפי תקופה: נוכחות, מגמה חודשית, ימי שבוע, תרגילים, תחומים ומצטיינים.
import { store } from "./store.js";
import { esc, ICON, fmtDate, FOCUS, STAGES, STAGE, monthKey, monthLabel, weekdayOf, DAY_SHORT, todayStr } from "./lib.js";

export const PERIODS = [["all", "כל הזמן"], ["month", "החודש"], ["90", "3 חודשים"], ["custom", "מותאם"]];

function range(period, custom = {}) {
  const d = new Date();
  if (period === "month") return { from: todayStr().slice(0, 7) + "-01", to: "" };
  if (period === "90") { d.setDate(d.getDate() - 90); return { from: d.toISOString().slice(0, 10), to: "" }; }
  if (period === "custom") return { from: custom.from || "", to: custom.to || "" };
  return { from: "", to: "" };
}

/* ---- חישוב תשלום למאמן ---- */
export const PAY_STATUS = {
  none: { label: "לא מדריך", pct: 30 }, young1: { label: "מדריך צעיר, שנה 1", pct: 35 }, young2: { label: "מדריך צעיר, שנה 2", pct: 40 },
  senior: { label: "מדריך ותיק (משנה 3)", pct: 45 }, exempt: { label: "עוסק פטור", pct: 55 }
};
export const feeOf = (perWeek) => (+perWeek >= 2 ? 250 : 200);
const money = (n) => new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₪";
/* חלק החודש ששולם עבור הילד. בחודש הנוכחי סופרים רק עד היום, כי עוד לא ידוע מה יקרה בהמשך */
export function monthFraction(startDate, month) {
  const [y, m] = month.split("-").map(Number), dim = new Date(y, m, 0).getDate(), first = `${month}-01`, last = `${month}-${String(dim).padStart(2, "0")}`;
  const now = todayStr(), isNow = month === now.slice(0, 7), end = isNow ? +now.slice(8, 10) : dim;
  if (startDate && startDate > last) return 0;
  const from = !startDate || startDate <= first ? 1 : +startDate.slice(8, 10);
  if (from > end) return 0;
  return (end - from + 1) / dim;
}
export function payCard(card, g, players, month) {
  const isNow = month >= todayStr().slice(0, 7), st = PAY_STATUS[g.payStatus], pct = g.payPct !== undefined && g.payPct !== "" ? +g.payPct : st?.pct;
  const rows = players.map((p) => { const pw = +p.perWeek || 2, fee = feeOf(pw), fr = monthFraction(p.startDate, month); return { p, pw, fee, fr, amt: fee * fr }; }).filter((r) => r.fr > 0);
  const total = rows.reduce((a, r) => a + r.amt, 0), coach = pct ? (total * pct) / 100 : 0;
  return card("חישוב תשלום", `<div class="paynav"><button class="btn small ghost" data-act="pay-month" data-d="-1" aria-label="חודש קודם">${ICON.chev}</button><b>${esc(monthLabel(month))}</b><button class="btn small ghost" data-act="pay-month" data-d="1" aria-label="חודש הבא" ${isNow ? "disabled" : ""}>${ICON.chev}</button></div>
    <div class="two"><div class="field"><label for="pst">סטטוס המאמן</label><select id="pst" data-act-change="pay-status"><option value="">בחרו סטטוס</option>${Object.entries(PAY_STATUS).map(([k, v]) => `<option value="${k}" ${g.payStatus === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></div>
    <div class="field"><label for="ppc">אחוז מהכנסה</label><input id="ppc" type="number" inputmode="decimal" min="0" max="100" data-act-change="pay-pct" value="${pct ?? ""}"></div></div>
    ${isNow ? `<p class="sub" style="margin:0 0 8px">חישוב יחסי עד היום (${fmtDate(todayStr())}). הסכום יגדל ככל שהחודש מתקדם.</p>` : ""}
    ${rows.length ? `<div class="ptable">${[[2, 250], [1, 200]].map(([w, fee]) => { const g2 = rows.filter((r) => (w === 2 ? r.pw >= 2 : r.pw < 2)); const sum = g2.reduce((a, r) => a + r.amt, 0), part = g2.filter((r) => r.fr < 1).length;
      return `<div class="prow"><span>${g2.length === 1 ? "ילד אחד" : g2.length + " ילדים"}</span><small>${w} בשבוע · ${fee} ₪ לילד${part && !isNow ? ` · ${part} יחסי` : ""}</small><b>${money(sum)}</b></div>`; }).join("")}</div>` : `<p class="sub">אין ילדים פעילים בחודש הזה.</p>`}
    <div class="ptotal"><div><span>הכנסות הקבוצה</span><b>${money(total)}</b></div>${pct ? `<div class="pay"><span>התשלום למאמן (${pct}%)</span><b>${money(coach)}</b></div>` : `<p class="sub" style="margin:6px 0 0">בחרו סטטוס כדי לחשב.</p>`}</div>
    <details class="pnote"><summary>אחוזים לפי סטטוס</summary><div class="plegend">${Object.entries(PAY_STATUS).map(([k, v]) => `<div class="${g.payStatus === k ? "on" : ""}"><span>${v.label}</span><b>${v.pct}%</b></div>`).join("")}</div></details>
    <p class="sub" style="margin:8px 0 0;font-size:13px">מחיר חודשי לילד: 200 ₪ לאימון בשבוע, 250 ₪ לשני אימונים או יותר. ילד שהתחיל באמצע החודש משלם יחסית לימים שנותרו. אי אפשר לחשב חודשים עתידיים.</p>`);
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const bar = (label, pct, text, color = "var(--floor)") =>
  `<div class="hbar"><span class="lb">${label}</span><span class="trk"><i style="width:${Math.max(2, Math.min(100, pct))}%;background:${color}"></i></span><b>${text}</b></div>`;

export function renderStats(gid, period, custom = {}, payMonth = todayStr().slice(0, 7)) {
  const { from, to } = range(period, custom);
  const players = store.all("players").filter((p) => p.groupId === gid);
  const all = store.all("sessions").filter((s) => s.groupId === gid && (!from || s.date >= from) && (!to || s.date <= to)).sort((a, b) => b.date.localeCompare(a.date));
  const closed = new Set(JSON.parse(localStorage.getItem("pivot.stat.closed") || "[]"));
  const card = (title, body) => `<section class="card statcard fold-card${closed.has(title) ? " closed" : ""}" data-k="${esc(title)}"><button class="sfold" data-act="stat-fold" aria-label="פתיחה או סגירה">${title}${ICON.chev}</button><div class="sbody">${body}</div></section>`;
  const g = store.get("groups", gid), payHtml = g ? payCard(card, g, players, payMonth) : "";
  const chips = `<div class="seg">${PERIODS.map(([k, l]) => `<button data-act="period" data-p="${k}" aria-pressed="${period === k}">${l}</button>`).join("")}</div>${period === "custom" ? `<div class="two" style="margin:10px 0"><div class="field"><label for="sfrom">מתאריך</label><input id="sfrom" type="date" data-act-change="stat-from" value="${esc(custom.from || "")}"></div><div class="field"><label for="sto">עד תאריך</label><input id="sto" type="date" data-act-change="stat-to" value="${esc(custom.to || "")}"></div></div>` : ""}`;
  if (!all.length) return chips + `<div class="card empty"><h3>אין עדיין נתונים</h3><p>הסטטיסטיקות יופיעו אחרי האימון הראשון בתקופה הזו.</p></div>${payHtml}`;

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
  const awards = store.all("awards").filter((a) => a.groupId === gid && (!from || a.month >= from.slice(0, 7)) && (!to || a.month <= to.slice(0, 7)));
  const starCount = {};
  awards.forEach((a) => (starCount[a.playerId] = (starCount[a.playerId] || 0) + 1));
  const stars = Object.entries(starCount).sort((a, b) => b[1] - a[1]).map(([id, n]) => [players.find((p) => p.id === id)?.name, n]).filter(([nm]) => nm);


  return chips + `<div class="foldall"><button class="btn small ghost" data-act="stat-all" data-v="open">פתיחת הכול</button><button class="btn small ghost" data-act="stat-all" data-v="close">סגירת הכול</button></div>
    <div class="kpis"><div class="kpi"><b>${all.length}</b><span>אימונים</span></div>
      <div class="kpi"><b>${avgPresent.toFixed(1).replace(".0", "")}</b><span>ילדים בממוצע</span></div>
      <div class="kpi"><b>${Math.round(avgPct)}%</b><span>נוכחות</span></div></div>
    ${best ? `<p class="note">האימון הכי מלא: ${presentOf(best)} ילדים, ${fmtDate(best.date)}.</p>` : ""}
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
    ${payHtml}`;
}
