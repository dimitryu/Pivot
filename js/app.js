import { store } from "./store.js";
import { SEED_DRILLS } from "./seed.js";
import { randomPlan, planFromSaved, swapDrill, snapOf, stageMinutes, stageList, emptyStages } from "./planner.js";
import { renderStats } from "./stats.js";
import { aiBuildPlan, aiKey, setAiKey, aiModel, setAiModel, MODELS } from "./ai.js";
import {
  $, esc, COLORS, ICON, STAGES, STAGE, FOCUS, DAY_SHORT, courtSVG, jersey, avatar, todayStr, fmtDate, fmtShort, monthLabel,
  lastMonths, daysLabel, scheduleOf, birthdaysInWeek, firstName, waLink, debounce, toast, dateInput, openSheet, closeSheet, resizeImage,
  BADGES, MATCH_KINDS, ageOf, avgOf, weekdayOf
} from "./lib.js";
import {
  runTimer, quickTimerSheet, stepsOf, assessmentsOf, assessSheet, badgeSheet, badgeDot, teamsSheet, shareSheet, sessionMessage, starMessage,
  matchMessage, printPlan, exportGroupIcs, matchForm, matchResult, RESULT_LABEL
} from "./features.js";

const app = $("#app");
const VERSION = "3.0.1";

/* ---------- נתונים נגזרים ---------- */
const groupColor = (g) => g?.color || COLORS[0];
const playersOf = (gid) => store.all("players").filter((p) => p.groupId === gid).sort((a, b) => (a.name || "").localeCompare(b.name || "", "he"));
const sessionsOf = (gid) => store.all("sessions").filter((s) => s.groupId === gid).sort((a, b) => b.date.localeCompare(a.date));
const presentCount = (s) => Object.values(s.attendance || {}).filter(Boolean).length;
const drillsAll = () => store.all("drills");
const starsOf = (pid) => store.all("awards").filter((a) => a.playerId === pid).length;
function rate(pid, gid) {
  const ss = sessionsOf(gid); if (!ss.length) return null;
  return Math.round((ss.filter((s) => s.attendance?.[pid]).length / ss.length) * 100);
}
// תוכנית של אימון: תמונת המצב שנשמרה, ואם אין (אימון ישן) אז לפי התוכנית שנבחרה
function planOf(s) {
  if (s.plan) return s.plan;
  const legacy = store.get("plans", s.planId);
  return legacy?.stages ? planFromSaved(legacy, drillsAll()) : null;
}

/* ---------- מסגרת ---------- */
let live = true;
function hero({ title, sub = "", back = "", compact = false, tabs = "" }) {
  return `<header class="hero ${compact ? "compact" : ""}">${courtSVG()}<div class="wrap">
    <div class="topbar">${back ? `<button class="back" data-go="${back}" aria-label="חזרה">${ICON.back}</button>` : `<span class="brand"><i></i>פיבוט</span>`}</div>
    <h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}${tabs}</div></header>`;
}
function nav(active) {
  const item = (k, label, go) => `<button data-go="${go}" ${active === k ? 'aria-current="page"' : ""}>${ICON[k]}<span>${label}</span></button>`;
  return `<nav class="nav">${courtSVG(true)}${item("groups", "קבוצות", "#/")}${item("plans", "תוכניות", "#/plans")}${item("settings", "הגדרות", "#/settings")}</nav>`;
}
const page = (heroHtml, body, active) => { app.innerHTML = `${heroHtml}<main class="wrap">${body}</main>${nav(active)}`; };
const tabsBar = (items, cur) => `<div class="tabs" role="tablist">${items.map(([k, l, h]) => `<button role="tab" aria-selected="${cur === k}" data-go="${h}">${l}</button>`).join("")}</div>`;

/* ---------- התחברות ---------- */
function viewLogin() {
  live = false;
  app.innerHTML = `<div class="login">${courtSVG()}${courtSVG(true)}
    <div class="ball-big"></div><h1>פיבוט</h1><p>קבוצות, נוכחות ותוכניות אימון לכדור יד ילדים</p>
    ${store.isCloud
      ? `<button class="btn" data-act="signin">כניסה עם Google</button>`
      : `<button class="btn" data-act="signin">התחלה במצב מקומי</button><p style="font-size:15px;opacity:.85">עדיין לא חיברנו ענן, ולכן הנתונים נשמרים רק במכשיר הזה.</p>`}</div>`;
}

/* ---------- ימי הולדת השבוע ---------- */
function birthdayCard(g, players, ref = new Date()) {
  const list = birthdaysInWeek(players, ref); if (!list.length) return "";
  const sched = scheduleOf(g), today = todayStr();
  const rows = list.map(({ p, date, age }) => {
    const dow = date.getDay(), tr = sched.find((x) => x.day === dow);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const when = iso === today ? "היום!" : `יום ${DAY_SHORT[dow]} ${date.getDate()}.${date.getMonth() + 1}`;
    const note = tr ? `יש אימון באותו יום${tr.time ? " ב-" + tr.time : ""}` : sched.length ? "אין אימון באותו יום" : "";
    return `<div class="bd-row">${avatar(p, groupColor(g))}<span class="grow"><b>${esc(p.name)}</b><small>${when}${age > 0 ? ` · גיל ${age}` : ""}${note ? ` · ${note}` : ""}</small></span></div>`;
  }).join("");
  return `<section class="bday"><h3>${ICON.cake} ימי הולדת השבוע</h3>${rows}</section>`;
}

/* ---------- בית ---------- */
function viewHome() {
  live = true;
  const groups = store.all("groups").slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const cards = groups.map((g) => {
    const n = playersOf(g.id).length, last = sessionsOf(g.id)[0];
    return `<button class="group-card" style="--gc:${groupColor(g)}" data-go="#/g/${g.id}">
      <span class="arc"></span><h3>${esc(g.name)}</h3><span class="meta">${esc([g.ages, daysLabel(g)].filter(Boolean).join(" · ")) || "&nbsp;"}</span>
      <span style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><span class="chip">${n} ילדים</span>${birthdaysInWeek(playersOf(g.id)).length ? `<span class="chip warn">${ICON.cake} ${birthdaysInWeek(playersOf(g.id)).length} ימי הולדת השבוע</span>` : ""}${last ? `<span class="chip">אימון אחרון ${fmtShort(last.date)}</span>` : ""}</span></button>`;
  }).join("");
  const empty = `<div class="card empty"><h3>עוד אין קבוצות</h3><p>פתחו קבוצה ראשונה, למשל "כיתות א׳–ב׳", ואז הוסיפו את הילדים.</p><button class="btn ball" data-act="group-new">${ICON.plus} קבוצה חדשה</button></div>`;
  const reminder = !store.isCloud && groups.length ? `<div class="note" style="margin-top:18px">הנתונים נשמרים רק במכשיר הזה. כדאי לגבות מדי פעם בהגדרות.</div>` : "";
  page(hero({ title: `שלום, ${firstName(store.user)}`, sub: groups.length ? "בחרו קבוצה כדי להתחיל אימון" : "בואו נקים את הקבוצה הראשונה" }),
    `${wsBanner()}${remindersCard(groups)}<div class="section-title"><h2>הקבוצות שלי</h2>${groups.length ? `<button class="btn small" data-act="group-new">${ICON.plus} קבוצה</button>` : ""}</div>
     ${groups.length ? `<div class="groups">${cards}</div>` : empty}${reminder}`, "groups");
}

/* ---------- קבוצה ---------- */
let statsPeriod = "all", starMonth = lastMonths(1)[0];
function viewGroup(gid, tab = "players") {
  live = true;
  const g = store.get("groups", gid); if (!g) return go("#/");
  const players = playersOf(gid), sessions = sessionsOf(gid);
  const tabs = tabsBar([["players", `ילדים`, `#/g/${gid}`], ["sessions", "אימונים", `#/g/${gid}/sessions`], ["matches", "משחקים", `#/g/${gid}/matches`], ["stars", "מצטיינים", `#/g/${gid}/stars`], ["stats", "נתונים", `#/g/${gid}/stats`]], tab);
  const newSession = `<button class="btn ball block" data-act="session-new" ${players.length ? "" : "disabled"} style="margin-bottom:16px">אימון חדש</button>`;
  let body = "";
  if (tab === "players") {
    const rows = players.map((p) => { const r = rate(p.id, gid), st = starsOf(p.id);
      return `<button class="row" data-go="#/p/${p.id}">${avatar(p, groupColor(g))}
        <span class="grow"><div class="name">${esc(p.name)}${p.health ? ` <span class="hl inline" title="רגישות בריאותית">${ICON.alert}</span>` : ""}</div><div class="sub">${r === null ? esc(p.parentName || "") : `הגיע ב-${r}% מהאימונים`}</div></span>${st ? `<span class="chip">${ICON.star} ${st}</span>` : ""}</button>`; }).join("");
    body = `${birthdayCard(g, players)}${newSession}${players.length ? `<div class="card">${rows}</div>` : `<div class="card empty"><h3>אין עדיין ילדים בקבוצה</h3><p>הוסיפו את הילדים כדי לסמן נוכחות.</p></div>`}
      <button class="btn ghost block" data-act="player-new" style="margin-top:14px">${ICON.plus} הוספת ילד</button>
      <div class="two" style="margin-top:22px"><button class="btn small ghost" data-act="group-ics">${ICON.cal} ימי האימון ליומן</button><button class="btn small ghost" data-act="group-edit">עריכת פרטי הקבוצה</button></div>`;
  } else if (tab === "matches") {
    body = matchesView(g);
  } else if (tab === "sessions") {
    const rows = sessions.map((s) => { const pl = planOf(s), n = s.notes ? esc(s.notes.slice(0, 70)) + (s.notes.length > 70 ? "…" : "") : "";
      return `<button class="row" data-go="#/summary/${s.id}"><span class="grow"><div class="name">${fmtDate(s.date)}</div>
        <div class="sub">${presentCount(s)} מתוך ${s.total || players.length} ילדים${pl ? ` · ${esc(pl.title)} · ${stageMinutes(pl)} דק׳` : ""}</div>${n ? `<div class="sub" style="margin-top:2px">${n}</div>` : ""}</span></button>`; }).join("");
    body = `${newSession}${sessions.length ? `<div class="card">${rows}</div>` : `<div class="card empty"><h3>עוד לא היו אימונים</h3><p>לחצו על "אימון חדש" בתחילת האימון הבא.</p></div>`}`;
  } else if (tab === "stars") body = starsView(g, players);
  else body = renderStats(gid, statsPeriod);
  page(hero({ title: g.name, sub: [g.ages, daysLabel(g), g.place].filter(Boolean).join(" · "), back: "#/", compact: true, tabs }), body, "groups");
}

/* ---------- מצטייני החודש ---------- */
function starsView(g, players) {
  const awards = store.all("awards").filter((a) => a.groupId === g.id).sort((a, b) => b.month.localeCompare(a.month));
  const cur = awards.find((a) => a.month === starMonth), curP = cur && players.find((p) => p.id === cur.playerId);
  const months = lastMonths(12);
  const picker = `<div class="field" style="margin-bottom:12px"><label for="sm">חודש</label><select id="sm" data-act-change="star-month">${months.map((m) => `<option value="${m}" ${m === starMonth ? "selected" : ""}>${monthLabel(m)}</option>`).join("")}</select></div>`;
  const hero2 = curP
    ? `<div class="starcard">${avatar(curP, groupColor(g))}<div><small>מצטיין ${monthLabel(starMonth)}</small><h3>${esc(curP.name)}</h3>${cur.note ? `<p>${esc(cur.note)}</p>` : ""}</div></div>
       <div class="two" style="margin-top:12px"><button class="btn ghost" data-act="star-share">${ICON.share} הודעה להורים</button><button class="btn ghost" data-act="star-pick">שינוי המצטיין</button></div>`
    : `<div class="card empty"><h3>עוד לא נבחר מצטיין ל${monthLabel(starMonth)}</h3><button class="btn ball" data-act="star-pick" ${players.length ? "" : "disabled"}>בחירת מצטיין החודש</button></div>`;
  const hist = awards.map((a) => { const p = players.find((x) => x.id === a.playerId);
    return p ? `<div class="row" style="cursor:default">${avatar(p, groupColor(g))}<span class="grow"><div class="name">${esc(p.name)}</div><div class="sub">${monthLabel(a.month)}${a.note ? " · " + esc(a.note) : ""}</div></span>${ICON.star}</div>` : ""; }).join("");
  return `${picker}${hero2}<div class="section-title"><h2>היסטוריה</h2></div>${hist ? `<div class="card">${hist}</div>` : `<div class="card empty"><p>המצטיינים יופיעו כאן לפי חודשים.</p></div>`}`;
}
function starForm(gid) {
  const g = store.get("groups", gid), players = playersOf(gid), cur = store.get("awards", `${gid}_${starMonth}`);
  openSheet(`<h2>מצטיין ${monthLabel(starMonth)}</h2><form id="sf">
    <div class="pickgrid">${players.map((p) => `<label class="pick"><input type="radio" name="w" value="${p.id}" ${cur?.playerId === p.id ? "checked" : ""} required>
      <span>${avatar(p, groupColor(g))}<b>${esc(p.name)}</b></span></label>`).join("")}</div>
    <div class="field" style="margin-top:14px"><label for="sn2">למה? (לא חובה)</label><input id="sn2" value="${esc(cur?.note)}" placeholder="למשל: עזר לחברים והתאמן בכל אימון"></div>
    <div class="sheet-actions sticky"><button class="btn ball block" type="submit">שמירה</button>
    ${cur ? `<button class="btn danger block" type="button" id="sd2">הסרת הבחירה</button>` : ""}<button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
  () => {
    $("#sf").addEventListener("submit", async (e) => { e.preventDefault();
      try { await store.save("awards", { id: `${gid}_${starMonth}`, groupId: gid, month: starMonth, playerId: $("#sf input:checked").value, note: $("#sn2").value.trim() }); closeSheet(); toast("נשמר"); } catch (er) { toast("השמירה נכשלה"); } });
    $("#sd2")?.addEventListener("click", async () => { await store.remove("awards", `${gid}_${starMonth}`); closeSheet(); });
  });
}

/* ---------- אימון: עריכה ---------- */
let pendingSave = null;
function commitSession(s) {
  s.present = presentCount(s); s.total = playersOf(s.groupId).length;
  return store.save("sessions", s);
}
const rerenderSession = (sid) => { const y = window.scrollY; viewSession(sid); window.scrollTo(0, y); };

function planBlock(s, editable) {
  const pl = planOf(s);
  if (!pl) return "";
  const minutes = stageMinutes(pl);
  const extra = pl.summary || pl.tips?.length ? `<div class="aibox"><b>עוזר AI</b>${pl.summary ? `<p>${esc(pl.summary)}</p>` : ""}${pl.tips?.length ? `<ul>${pl.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</div>` : "";
  return `<div class="section-title"><h2>${esc(pl.title)}</h2><span class="chip">${minutes} דק׳</span></div>${extra}` +
    stageList(pl).map((st) => `<section class="stage" style="--sc:${st.color}"><header><h3>${st.label}</h3>${editable ? `<button class="icon-btn" data-act="add-drill" data-stage="${st.k}" aria-label="הוספת תרגיל">${ICON.plus}</button>` : ""}</header>
      ${st.drills.length ? st.drills.map((d, i) => `<div class="sdrill"><div class="grow"><div class="t">${esc(d.name)} <span class="chip">${d.minutes} דק׳</span>${d.focus ? ` <span class="chip">${FOCUS[d.focus] || ""}</span>` : ""}</div>
        ${d.desc ? `<div class="d">${esc(d.desc)}</div>` : ""}${d.why ? `<div class="why">${esc(d.why)}</div>` : ""}</div>
        ${editable ? `<button class="icon-btn" data-act="swap" data-stage="${st.k}" data-i="${i}" aria-label="החלפה">${ICON.swap}</button><button class="icon-btn" data-act="rm-drill" data-stage="${st.k}" data-i="${i}" aria-label="הסרה">${ICON.x}</button>` : ""}</div>`).join("") : `<div class="sub" style="padding:4px 0">אין תרגיל בשלב הזה</div>`}</section>`).join("");
}

function viewSession(sid) {
  live = false;
  const s = store.get("sessions", sid); if (!s) return go("#/");
  const g = store.get("groups", s.groupId), players = playersOf(s.groupId), pl = planOf(s);
  const tiles = players.map((p) => `<button class="tile" data-act="toggle" data-id="${p.id}" aria-pressed="${!!s.attendance?.[p.id]}">
      <span class="tick">${ICON.check}</span>${p.health ? `<span class="hl">${ICON.alert}</span>` : ""}${avatar(p, groupColor(g))}<span class="nm">${esc(p.name)}</span></button>`).join("");
  const tools = `<div class="tools"><button data-act="timer-run" ${pl ? "" : "disabled"}>${ICON.timer}<span>שעון אימון</span></button><button data-act="teams">${ICON.teams}<span>חלוקה לקבוצות</span></button>
    <button data-act="plan-print" ${pl ? "" : "disabled"}>${ICON.print}<span>הדפסה</span></button><button data-act="timer-quick">${ICON.timer}<span>טיימר מהיר</span></button></div>`;
  const chooser = `<div class="section-title"><h2>תוכנית האימון</h2></div><div class="modes3">
      <button class="mode" data-act="plan-mine"><b>התוכנית שלי</b><span>בחירה מתוכנית ששמרתי</span></button>
      <button class="mode" data-act="plan-random"><b>הגרלה</b><span>תרגיל אקראי מכל שלב</span></button>
      <button class="mode ai" data-act="plan-ai"><b>עוזר AI</b><span>מערך לפי הבקשה שלכם, בשיחה חופשית</span></button></div>`;
  const planActions = pl ? `<div class="two" style="margin:14px 0">${pl.mode === "random" ? `<button class="btn ghost" data-act="plan-redo">הגרלה מחדש</button>` : pl.mode === "ai" ? `<button class="btn ghost" data-act="plan-ai-redo">בקשת שינוי מה-AI</button>` : `<span></span>`}
      <button class="btn ghost" data-act="plan-clear">בחירת תוכנית אחרת</button></div>` : "";
  page(hero({ title: fmtDate(s.date), sub: g?.name, back: `#/g/${s.groupId}/sessions`, compact: true }),
    `<div class="card session-head">
      <div class="counter"><b id="cnt">${presentCount(s)}</b><span>מתוך ${players.length} ילדים הגיעו</span></div>
      <div class="bar"><i id="bar" style="width:${players.length ? (presentCount(s) / players.length) * 100 : 0}%"></i></div>
      <div class="field" style="margin:0"><label for="sd">תאריך</label><input id="sd" type="date" value="${s.date}"></div></div>
    ${birthdayCard(g, players, new Date(s.date + "T12:00:00"))}${healthBanner(players)}${tools}
    <div class="tiles">${tiles}</div>
    <div class="two" style="margin-top:14px"><button class="btn ghost" data-act="all-on">כולם הגיעו</button><button class="btn ghost" data-act="all-off">איפוס</button></div>
    <div class="field" style="margin-top:20px"><label for="sn">הערות לאימון</label><textarea id="sn" placeholder="מה עבד, מי התבלט, מה לשפר בפעם הבאה">${esc(s.notes || "")}</textarea></div>
    ${pl ? planBlock(s, true) + planActions : chooser}
    <div class="sheet-actions" style="margin-top:22px"><button class="btn ball block" data-act="session-save">שמירת האימון</button>
    <button class="btn danger block" data-act="session-del">מחיקת האימון</button></div>`, "groups");
  pendingSave = debounce(() => commitSession(s), 350);
  dateInput($("#sd"), (v) => { s.date = v; commitSession(s).then(() => rerenderSession(sid)); });
  $("#sn").oninput = (e) => { s.notes = e.target.value; pendingSave(); };
}
function refreshCounter(s) {
  const n = presentCount(s), total = playersOf(s.groupId).length;
  $("#cnt").textContent = n; $("#bar").style.width = (total ? (n / total) * 100 : 0) + "%";
}

/* ---------- עוזר AI ---------- */
function aiSheet(prefill = {}) {
  const s = curSession(), g = store.get("groups", s.groupId), hasKey = !!aiKey();
  openSheet(`<h2>עוזר AI לבניית מערך</h2><form id="af">
    ${hasKey ? "" : `<div class="note" style="margin-bottom:14px">צריך מפתח Anthropic API פעם אחת. הוא נשמר רק במכשיר הזה. מומלץ ליצור מפתח ייעודי עם תקרת הוצאה ב-console.anthropic.com.</div>
    <div class="field"><label for="ak">מפתח API</label><input id="ak" type="password" autocomplete="off" placeholder="sk-ant-..."></div>`}
    <div class="field"><label for="ar">מה חשוב לכם באימון הזה?</label><textarea id="ar" placeholder="למשל: לעבוד על מסירות, הרבה ילדים חדשים, חם באולם">${esc(prefill.request)}</textarea></div>
    <div class="field"><label for="am">משך האימון</label><select id="am">${[30, 45, 60, 75, 90].map((m) => `<option value="${m}" ${m === (prefill.minutes || 45) ? "selected" : ""}>${m} דקות</option>`).join("")}</select></div>
    <p class="sub" style="color:var(--ink-soft);margin-top:0">נשלחים רק שמות תרגילים, מספר הילדים וסיכום האימונים האחרונים. שמות ילדים והערות לא נשלחים.</p>
    <div class="sheet-actions sticky"><button class="btn ball block" type="submit" id="ago">בניית המערך</button><button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
  () => $("#af").addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("#ak")) { if (!$("#ak").value.trim()) return toast("נא להזין מפתח API"); setAiKey($("#ak").value); }
    const btn = $("#ago"); btn.disabled = true; btn.textContent = "בונה מערך...";
    try {
      const request = $("#ar").value.trim(), minutes = +$("#am").value;
      const recent = sessionsOf(s.groupId).filter((x) => x.id !== s.id && x.plan).slice(0, 5)
        .map((x) => `${x.date}: ${Object.values(x.plan.stages || {}).flat().map((d) => d.name).join(", ")}`);
      const plan = await aiBuildPlan({ drills: drillsAll(), groupName: g?.name, ages: g?.ages, present: presentCount(s) || playersOf(s.groupId).length, minutes, request, recent });
      closeSheet(); setPlan(plan); toast("המערך מוכן");
    } catch (er) { btn.disabled = false; btn.textContent = "בניית המערך"; toast(er.message || "הבקשה נכשלה"); }
  }));
}

/* ---------- אימון: סיכום לצפייה ---------- */
function viewSummary(sid) {
  live = true;
  const s = store.get("sessions", sid); if (!s) return go("#/");
  const g = store.get("groups", s.groupId), players = playersOf(s.groupId);
  const here = players.filter((p) => s.attendance?.[p.id]), away = players.filter((p) => !s.attendance?.[p.id]);
  const chip = (p) => `<span class="pchip">${avatar(p, groupColor(g))}<b>${esc(p.name)}</b></span>`;
  page(hero({ title: fmtDate(s.date), sub: g?.name, back: `#/g/${s.groupId}/sessions`, compact: true }),
    `<div class="kpis"><div class="kpi"><b>${here.length}</b><span>הגיעו</span></div><div class="kpi"><b>${away.length}</b><span>חסרו</span></div>
      <div class="kpi"><b>${players.length ? Math.round((here.length / players.length) * 100) : 0}%</b><span>נוכחות</span></div></div>
    <section class="card statcard"><h3>מי הגיע</h3><div class="pchips">${here.map(chip).join("") || '<span class="sub">אף אחד לא סומן</span>'}</div></section>
    ${away.length ? `<section class="card statcard"><h3>מי לא הגיע</h3><div class="pchips dim">${away.map(chip).join("")}</div></section>` : ""}
    <section class="card statcard"><h3>הערות</h3>${s.notes ? `<p style="margin:0 0 12px;white-space:pre-wrap">${esc(s.notes)}</p>` : `<p class="sub" style="margin:0 0 12px">עוד אין הערה לאימון הזה.</p>`}
      <button class="btn small ghost" data-act="note-edit">${s.notes ? "עריכת הערה" : "הוספת הערה"}</button></section>
    ${planOf(s) ? planBlock(s, false) : `<div class="note">לא נבחרה תוכנית לאימון הזה.</div>`}
    <div class="two" style="margin-top:20px"><button class="btn ghost" data-act="summary-share">${ICON.share} הודעה להורים</button><button class="btn ghost" data-act="plan-print" ${planOf(s) ? "" : "disabled"}>${ICON.print} הדפסה</button></div>
    <button class="btn ball block" data-go="#/s/${s.id}" style="margin-top:12px">עריכת האימון</button>`, "groups");
}

/* ---------- תוכניות וספריית תרגילים ---------- */
const plansTabs = (cur) => tabsBar([["plans", "התוכניות שלי", "#/plans"], ["library", "ספריית תרגילים", "#/plans/library"]], cur);
function viewPlans() {
  live = true;
  const plans = store.all("plans").slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "he"));
  const rows = plans.map((p) => { const ids = Object.values(p.stages || {}).flat(), mins = ids.reduce((a, id) => a + (+store.get("drills", id)?.minutes || 0), 0);
    return `<button class="row" data-go="#/plan/${p.id}"><span class="grow"><div class="name">${esc(p.title)}</div><div class="sub">${ids.length} תרגילים · ${mins} דקות</div></span></button>`; }).join("");
  page(hero({ title: "תוכניות אימון", sub: "ארבעה שלבים: חימום, משחקון, יסודות ומשחק סיום", tabs: plansTabs("plans") }),
    `<div class="section-title"><h2>התוכניות ששמרתי</h2><button class="btn small" data-act="plan-new">${ICON.plus} תוכנית</button></div>
     ${plans.length ? `<div class="card">${rows}</div>` : `<div class="card empty"><h3>עוד אין תוכניות שמורות</h3><p>בחרו תרגילים מהספרייה לכל שלב ותנו שם לתוכנית. אפשר גם לקבל באימון הגרלה או הצעה חכמה בלי לשמור תוכנית.</p></div>`}`, "plans");
}
// מצב הקיפול נשמר במכשיר. ברירת מחדל: הכול מקופל, וכך רואים את ארבעת השלבים במבט אחד.
const openStages = () => { try { return JSON.parse(localStorage.getItem("pivot.lib.open") || "[]"); } catch { return []; } };
function viewLibrary() {
  live = true;
  const drills = drillsAll(), open = openStages();
  const sec = STAGES.map((st) => { const list = drills.filter((d) => d.stage === st.k).sort((a, b) => a.name.localeCompare(b.name, "he")), isOpen = open.includes(st.k);
    return `<section class="stage collapsible ${isOpen ? "open" : ""}" style="--sc:${st.color}"><header><button class="fold" data-act="fold" data-stage="${st.k}" aria-expanded="${isOpen}"><span class="chev">${ICON.chev}</span><h3>${st.label} <small>(${list.length})</small></h3></button><button class="btn small" data-act="drill-new" data-stage="${st.k}">${ICON.plus} תרגיל</button></header>
      <div class="card fold-body" style="box-shadow:none;background:#fff" ${isOpen ? "" : "hidden"}>${list.map((d) => `<button class="row" data-act="drill-edit" data-id="${d.id}"><span class="grow"><div class="name">${esc(d.name)}</div><div class="sub">${d.minutes} דק׳${d.focus ? " · " + FOCUS[d.focus] : ""}</div></span></button>`).join("") || '<div class="empty">אין תרגילים בשלב הזה</div>'}</div></section>`; }).join("");
  page(hero({ title: "ספריית תרגילים", sub: `${drills.length} תרגילים בארבעה שלבים`, tabs: plansTabs("library") }), sec, "plans");
}
function drillForm(d = {}, stage = "basics") {
  openSheet(`<h2>${d.id ? "עריכת תרגיל" : "תרגיל חדש"}</h2><form id="df">
    <div class="two"><div class="field"><label for="ds">שלב</label><select id="ds">${STAGES.map((s) => `<option value="${s.k}" ${(d.stage || stage) === s.k ? "selected" : ""}>${s.label}</option>`).join("")}</select></div>
    <div class="field"><label for="dm">דקות</label><input id="dm" type="number" inputmode="numeric" min="1" max="60" value="${esc(d.minutes || 10)}"></div></div>
    <div class="field"><label for="dn">שם התרגיל</label><input id="dn" required value="${esc(d.name)}"></div>
    <div class="two"><div class="field"><label for="df2">תחום</label><select id="df2"><option value="">ללא</option>${Object.entries(FOCUS).map(([k, v]) => `<option value="${k}" ${d.focus === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
    <div class="field"><label for="dp">מינימום ילדים</label><input id="dp" type="number" inputmode="numeric" min="0" value="${esc(d.min || 0)}"></div></div>
    <div class="field"><label for="dd">הסבר</label><textarea id="dd" placeholder="איך משחקים? מה המטרה?">${esc(d.desc)}</textarea></div>
    <div class="sheet-actions sticky"><button class="btn ball block" type="submit">שמירה</button>${d.id ? `<button class="btn danger block" type="button" id="dx">מחיקת התרגיל</button>` : ""}<button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
  () => {
    $("#df").addEventListener("submit", async (e) => { e.preventDefault();
      try { await store.save("drills", { ...d, stage: $("#ds").value, name: $("#dn").value.trim(), minutes: +$("#dm").value || 10, focus: $("#df2").value, min: +$("#dp").value || 0, desc: $("#dd").value.trim() }); closeSheet(); } catch { toast("השמירה נכשלה"); } });
    $("#dx")?.addEventListener("click", async () => { if (confirm("למחוק את התרגיל מהספרייה? אימונים שכבר נשמרו לא ישתנו.")) { await store.remove("drills", d.id); closeSheet(); } });
  });
}

let draft = null;
function viewPlan(id) {
  live = false;
  if (!draft || draft.key !== id) { const p = store.get("plans", id); draft = { key: id, id: p?.id, title: p?.title || "", stages: { ...emptyStages(), ...structuredClone(p?.stages || {}) } }; }
  const blocks = STAGES.map((st) => { const ids = draft.stages[st.k];
    return `<section class="stage" style="--sc:${st.color}"><header><h3>${st.label}</h3><button class="btn small" data-act="plan-pick" data-stage="${st.k}">${ICON.plus} תרגילים</button></header>
      ${ids.map((did) => { const d = store.get("drills", did); return d ? `<div class="sdrill"><div class="grow"><div class="t">${esc(d.name)} <span class="chip">${d.minutes} דק׳</span></div></div><button class="icon-btn" data-act="plan-unpick" data-stage="${st.k}" data-id="${did}" aria-label="הסרה">${ICON.x}</button></div>` : ""; }).join("") || `<div class="sub">עוד לא נבחרו תרגילים</div>`}</section>`; }).join("");
  const mins = Object.values(draft.stages).flat().reduce((a, i) => a + (+store.get("drills", i)?.minutes || 0), 0);
  page(hero({ title: draft.id ? "עריכת תוכנית" : "תוכנית חדשה", sub: `${mins} דקות`, back: "#/plans", compact: true }),
    `<div class="field"><label for="pt">שם התוכנית</label><input id="pt" value="${esc(draft.title)}" placeholder="למשל: מסירות ושער"></div>${blocks}
     <div class="sheet-actions" style="margin-top:20px"><button class="btn ball block" data-act="plan-save">שמירת התוכנית</button>${draft.id ? `<button class="btn danger block" data-act="plan-del">מחיקת התוכנית</button>` : ""}</div>`, "plans");
  $("#pt").oninput = (e) => (draft.title = e.target.value);
}
function pickDrills(stage, selected, onDone, { single = false, exclude = [] } = {}) {
  const list = drillsAll().filter((d) => d.stage === stage && !exclude.includes(d.id)).sort((a, b) => a.name.localeCompare(b.name, "he"));
  openSheet(`<h2>${STAGE[stage].label}: ${single ? "בחירת תרגיל" : "בחירת תרגילים"}</h2><form id="pk">
    <div class="picklist">${list.map((d) => `<label class="pickrow"><input type="${single ? "radio" : "checkbox"}" name="d" value="${d.id}" ${selected.includes(d.id) ? "checked" : ""}>
      <span><b>${esc(d.name)}</b><small>${d.minutes} דק׳${d.focus ? " · " + FOCUS[d.focus] : ""}</small></span></label>`).join("") || '<p class="sub">אין תרגילים בשלב הזה. אפשר להוסיף בספרייה.</p>'}</div>
    <div class="sheet-actions sticky"><button class="btn ball block" type="submit">אישור</button><button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
  () => $("#pk").addEventListener("submit", (e) => { e.preventDefault(); onDone([...document.querySelectorAll("#pk input:checked")].map((i) => i.value)); closeSheet(); }));
}

/* ---------- הגדרות ---------- */
function viewSettings() {
  live = true;
  const last = localStorage.getItem("pivot.lastBackup");
  page(hero({ title: "הגדרות", sub: store.isCloud ? store.user?.email : "מצב מקומי (נתונים במכשיר בלבד)" }),
    `<div class="section-title"><h2>גיבוי</h2></div><div class="card" style="padding:16px">
      <p style="margin-top:0">${store.isCloud ? "הנתונים נשמרים בענן ומסתנכרנים בין הטלפון והמחשב. גיבוי לקובץ הוא ביטוח נוסף." : "הנתונים נשמרים רק במכשיר הזה. גבו לקובץ כדי לא לאבד אותם."}</p>
      <p class="sub" style="color:var(--ink-soft);margin-top:0">${last ? "גיבוי אחרון: " + new Date(+last).toLocaleDateString("he-IL") : "עוד לא בוצע גיבוי לקובץ"}</p>
      <div class="two"><button class="btn" data-act="export">גיבוי לקובץ</button><button class="btn ghost" data-act="import">שחזור מקובץ</button></div>
      <input id="file" type="file" accept="application/json,.json" class="hidden"></div>
     <div class="section-title"><h2>עוזר AI</h2></div><div class="card" style="padding:16px">
      <p style="margin-top:0">${aiKey() ? "מפתח API שמור במכשיר הזה." : "עוד לא הוגדר מפתח. אפשר להוסיף אותו כאן או בפעם הראשונה שבוחרים עוזר AI באימון."}</p>
      <div class="field"><label for="sk">מפתח API</label><input id="sk" type="password" autocomplete="off" placeholder="${aiKey() ? "•••••••• (השאירו ריק כדי לא לשנות)" : "sk-ant-..."}"></div>
      <div class="field"><label for="smod">מודל</label><select id="smod">${MODELS.map(([v, l]) => `<option value="${v}" ${v === aiModel() ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="two"><button class="btn" data-act="ai-save">שמירה</button>${aiKey() ? `<button class="btn danger" data-act="ai-clear">הסרת המפתח</button>` : "<span></span>"}</div></div>
     ${store.share.supported() ? `<div class="section-title"><h2>שיתוף עם מאמן נוסף</h2></div><div class="card" style="padding:16px" id="shareBox"><p class="sub" style="margin:0">טוען...</p></div>` : ""}
     <div class="section-title"><h2>חשבון</h2></div><div class="card" style="padding:16px">
      <div id="install" class="${deferredInstall ? "" : "hidden"}" style="margin-bottom:12px"><button class="btn ball block" data-act="install">התקנה על המסך הראשי</button></div>
      <button class="btn danger block" data-act="signout">${store.isCloud ? "יציאה מהחשבון" : "יציאה מהמצב המקומי"}</button></div>
     <p style="text-align:center;color:var(--ink-soft);font-size:14px;margin-top:20px">פיבוט גרסה ${VERSION}</p>`, "settings");
  if (store.share.supported()) fillShareBox();
}
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; $("#install")?.classList.remove("hidden"); });

/* ---------- טפסי קבוצה וילד ---------- */
function groupForm(g = {}) {
  const times = Object.fromEntries(scheduleOf(g).map((x) => [x.day, x.time]));
  const days = new Set(Object.keys(times).map(Number));
  openSheet(`<h2>${g.id ? "פרטי הקבוצה" : "קבוצה חדשה"}</h2><form id="gf">
      <div class="field"><label for="gn">שם הקבוצה</label><input id="gn" required value="${esc(g.name)}" placeholder="למשל: כיתות א׳–ב׳"></div>
      <div class="field"><label for="ga">גילאים</label><input id="ga" value="${esc(g.ages)}" placeholder="6–8"></div>
      <div class="field"><label>ימי פעילות</label><div class="days">${DAY_SHORT.map((n, i) => `<label class="dayp"><input class="vh" type="checkbox" name="d" value="${i}" ${days.has(i) ? "checked" : ""}><span>${n}</span></label>`).join("")}</div></div>
      <div id="times"></div>
      <div class="field"><label for="gp">מקום</label><input id="gp" value="${esc(g.place)}" placeholder="אולם ספורט"></div>
      <div class="field"><label>צבע הקבוצה</label><div class="days" id="cols">${COLORS.map((c) => `<label class="dayp swp"><input class="vh" type="radio" name="c" value="${c}" ${c === (g.color || COLORS[0]) ? "checked" : ""}><span style="background:${c}"></span></label>`).join("")}</div></div>
      <div class="sheet-actions sticky"><button class="btn ball block" type="submit">שמירה</button>
      ${g.id ? `<button class="btn danger block" type="button" id="gd">מחיקת הקבוצה</button>` : ""}<button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
  (root) => {
    // שורת שעה לכל יום שנבחר
    const paintTimes = () => {
      document.querySelectorAll("#times input[data-day]").forEach((i) => (times[i.dataset.day] = i.value));
      const sel = [...root.querySelectorAll('input[name="d"]:checked')].map((i) => +i.value);
      $("#times").innerHTML = sel.length ? `<div class="field"><label>שעת אימון לכל יום</label>${sel.map((d) => `<div class="trow"><span>יום ${DAY_SHORT[d]}</span><input type="time" data-day="${d}" value="${esc(times[d] || "")}" aria-label="שעה ביום ${DAY_SHORT[d]}"></div>`).join("")}</div>` : "";
    };
    root.querySelectorAll('input[name="d"]').forEach((i) => i.addEventListener("change", paintTimes)); paintTimes();
    $("#gf").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        paintTimes();
        const schedule = [...root.querySelectorAll('input[name="d"]:checked')].map((i) => ({ day: +i.value, time: times[i.value] || "" })).sort((a, b) => a.day - b.day);
        const { days, time, ...clean } = g;
        const o = { ...clean, schedule, name: $("#gn").value.trim(), ages: $("#ga").value.trim(), place: $("#gp").value.trim(),
          color: root.querySelector('input[name="c"]:checked').value, createdAt: g.createdAt || Date.now() };
        const saved = await store.save("groups", o); closeSheet(); toast("הקבוצה נשמרה"); if (!g.id) go("#/g/" + saved.id);
      } catch (er) { toast("השמירה נכשלה: " + (er.message || er)); }
    });
    $("#gd")?.addEventListener("click", async () => {
      if (!confirm(`למחוק את "${g.name}" יחד עם כל הילדים והאימונים שלה? אי אפשר לבטל.`)) return;
      closeSheet(); await store.removeGroup(g.id); go("#/");
    });
  });
}

function playerForm(gid, p = {}) {
  const g = store.get("groups", gid);
  let photo = p.photo || "";
  openSheet(`<h2>${p.id ? esc(p.name) : "ילד חדש"}</h2>
    ${p.parentPhone ? `<div class="contact"><a class="btn small" href="tel:${esc(p.parentPhone)}">התקשרות להורה</a><a class="btn small ghost" target="_blank" rel="noopener" href="${waLink(p.parentPhone)}">וואטסאפ</a></div>` : ""}
    <form id="pf">
      <div class="photo-edit"><div id="pv" class="pv"></div><div class="photo-btns">
        <button class="btn small ghost" type="button" id="pcam">${ICON.camera} צילום</button><button class="btn small ghost" type="button" id="pgal">${ICON.image} מהגלריה</button>
        <button class="btn small ghost" type="button" id="prm">הסרה</button></div>
        <input id="fcam" type="file" accept="image/*" capture="user" class="hidden"><input id="fgal" type="file" accept="image/*" class="hidden"></div>
      <div class="two" style="grid-template-columns:2fr 1fr"><div class="field"><label for="pn">שם מלא</label><input id="pn" required value="${esc(p.name)}"></div>
      <div class="field"><label for="pm">מספר חולצה</label><input id="pm" type="number" inputmode="numeric" min="0" max="99" value="${esc(p.number)}"></div></div>
      <div class="field"><label for="pb">תאריך לידה</label><input id="pb" type="date" value="${esc(p.birth)}"></div>
      <div class="two"><div class="field"><label for="pr">שם ההורה</label><input id="pr" value="${esc(p.parentName)}"></div>
      <div class="field"><label for="pp">טלפון ההורה</label><input id="pp" type="tel" inputmode="tel" value="${esc(p.parentPhone)}" placeholder="050-0000000"></div></div>
      <div class="field"><label for="ph">בריאות ורגישויות</label><textarea id="ph" placeholder="אסתמה, אלרגיה, תרופות">${esc(p.health)}</textarea></div>
      <div class="field"><label for="pt2">הערות מאמן</label><textarea id="pt2" placeholder="חוזקות, מה לחזק, התקדמות">${esc(p.notes)}</textarea></div>
      <div class="sheet-actions sticky"><button class="btn ball block" type="submit">שמירה</button>
      ${p.id ? `<button class="btn danger block" type="button" id="pd">הסרת הילד מהקבוצה</button>` : ""}<button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
  () => {
    const paint = () => { $("#pv").innerHTML = avatar({ photo, number: $("#pm").value }, groupColor(g)); $("#prm").classList.toggle("hidden", !photo); };
    paint(); $("#pm").addEventListener("input", paint);
    $("#pcam").onclick = () => $("#fcam").click(); $("#pgal").onclick = () => $("#fgal").click();
    $("#prm").onclick = () => { photo = ""; paint(); };
    for (const id of ["fcam", "fgal"]) $("#" + id).addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { photo = await resizeImage(f); paint(); } catch { toast("לא הצלחנו לקרוא את התמונה"); } e.target.value = "";
    });
    $("#pf").addEventListener("submit", async (e) => { e.preventDefault();
      try { await store.save("players", { ...p, groupId: gid, photo, name: $("#pn").value.trim(), number: $("#pm").value, birth: $("#pb").value, parentName: $("#pr").value.trim(), parentPhone: $("#pp").value.trim(), health: $("#ph").value.trim(), notes: $("#pt2").value.trim(), createdAt: p.createdAt || Date.now() }); closeSheet(); }
      catch (er) { toast("השמירה נכשלה: " + (er.message || er)); } });
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
  if (a === "g" && b) viewGroup(b, ["sessions", "matches", "stars", "stats"].includes(c) ? c : "players");
  else if (a === "p" && b) viewPlayer(b);
  else if (a === "s" && b) viewSession(b);
  else if (a === "summary" && b) viewSummary(b);
  else if (a === "plans") (b === "library" ? viewLibrary : viewPlans)();
  else if (a === "plan" && b) viewPlan(b);
  else if (a === "settings") viewSettings();
  else viewHome();
  if (live) window.scrollTo(0, y);
}
window.addEventListener("hashchange", () => { draft = null; route(); window.scrollTo(0, 0); });
let pending;
store.onChange(() => { if (live && ready && store.user) { cancelAnimationFrame(pending); pending = requestAnimationFrame(route); } });

/* ---------- פעולות ---------- */
const curGid = () => (location.hash.split("/")[1] === "g" ? location.hash.split("/")[2] : null);
const curSession = () => store.get("sessions", location.hash.split("/")[2]);
function setPlan(plan) { const s = curSession(); s.plan = plan; s.planId = plan.planId || ""; commitSession(s); rerenderSession(s.id); }
const actions = {
  signin: () => store.signIn().catch((e) => toast("ההתחברות נכשלה: " + (e.code || e.message))),
  signout: () => confirm("לצאת מהחשבון?") && store.signOut(),
  "group-new": () => groupForm(),
  "group-edit": () => groupForm(store.get("groups", curGid())),
  "player-new": () => playerForm(curGid()),
  "player-edit": (el) => { const p = store.get("players", el.dataset.id); playerForm(p?.groupId || curGid(), p); },
  period: (el) => { statsPeriod = el.dataset.p; route(); },
  "star-pick": () => starForm(curGid()),
  "session-new": async () => {
    const gid = curGid(), today = todayStr(), ex = sessionsOf(gid).find((s) => s.date === today);
    if (ex) return go("#/s/" + ex.id);
    const s = await store.save("sessions", { groupId: gid, date: today, attendance: {}, notes: "", present: 0, total: playersOf(gid).length });
    go("#/s/" + s.id);
  },
  toggle: (el) => {
    const s = curSession(); s.attendance = s.attendance || {};
    const on = !s.attendance[el.dataset.id]; s.attendance[el.dataset.id] = on;
    el.setAttribute("aria-pressed", on); refreshCounter(s); commitSession(s);
  },
  "all-on": () => { const s = curSession(); s.attendance = Object.fromEntries(playersOf(s.groupId).map((p) => [p.id, true])); commitSession(s); rerenderSession(s.id); },
  "all-off": () => { const s = curSession(); s.attendance = {}; commitSession(s); rerenderSession(s.id); },
  "session-save": async () => { const s = curSession(); pendingSave?.flush?.(); await commitSession(s); toast("האימון נשמר"); go(`#/summary/${s.id}`); },
  "session-del": async () => { const s = curSession(); if (!confirm("למחוק את האימון הזה?")) return; await store.remove("sessions", s.id); go(`#/g/${s.groupId}/sessions`); },
  "plan-ai": () => aiSheet(),
  "plan-ai-redo": () => aiSheet({ request: curSession().plan?.request, minutes: curSession().plan?.minutes }),
  "ai-save": () => { const k = $("#sk").value.trim(); if (k) setAiKey(k); setAiModel($("#smod").value); toast("הגדרות ה-AI נשמרו"); viewSettings(); },
  "ai-clear": () => { setAiKey(""); toast("המפתח הוסר מהמכשיר"); viewSettings(); },
  "plan-mine": () => {
    const plans = store.all("plans").filter((p) => p.stages);
    if (!plans.length) return toast("עוד אין תוכניות שמורות. אפשר ליצור בלשונית תוכניות.");
    openSheet(`<h2>בחירת תוכנית</h2><div class="card">${plans.map((p) => `<button class="row" data-act="plan-use" data-id="${p.id}"><span class="grow"><div class="name">${esc(p.title)}</div></span></button>`).join("")}</div>`);
  },
  "plan-use": (el) => { closeSheet(); setPlan(planFromSaved(store.get("plans", el.dataset.id), drillsAll())); },
  "plan-random": () => setPlan(randomPlan(drillsAll())),
  "plan-redo": () => actions["plan-random"](),
  "plan-clear": () => { const s = curSession(); s.plan = null; s.planId = ""; commitSession(s); rerenderSession(s.id); },
  swap: (el) => { const s = curSession(), pl = planOf(s); s.plan = pl;
    if (!swapDrill(pl, el.dataset.stage, +el.dataset.i, drillsAll())) return toast("אין עוד תרגילים בשלב הזה"); commitSession(s); rerenderSession(s.id); },
  "rm-drill": (el) => { const s = curSession(); s.plan = planOf(s); s.plan.stages[el.dataset.stage].splice(+el.dataset.i, 1); commitSession(s); rerenderSession(s.id); },
  "add-drill": (el) => { const s = curSession(); s.plan = planOf(s); const st = el.dataset.stage;
    pickDrills(st, [], ([id]) => { if (!id) return; s.plan.stages[st].push(snapOf(store.get("drills", id))); commitSession(s); rerenderSession(s.id); }, { single: true, exclude: s.plan.stages[st].map((d) => d.id) }); },
  "plan-new": () => { draft = null; location.hash = "#/plan/new"; },
  "plan-pick": (el) => { const st = el.dataset.stage; pickDrills(st, draft.stages[st], (ids) => { draft.stages[st] = ids; viewPlan(draft.key); }); },
  "plan-unpick": (el) => { draft.stages[el.dataset.stage] = draft.stages[el.dataset.stage].filter((i) => i !== el.dataset.id); viewPlan(draft.key); },
  "plan-save": async () => {
    if (!draft.title.trim()) return toast("נא לתת שם לתוכנית");
    await store.save("plans", { ...(draft.id ? store.get("plans", draft.id) : {}), title: draft.title.trim(), stages: draft.stages }); draft = null; toast("התוכנית נשמרה"); go("#/plans");
  },
  "plan-del": async () => { if (!confirm("למחוק את התוכנית? אימונים שנשמרו לא ישתנו.")) return; await store.remove("plans", draft.id); draft = null; go("#/plans"); },
  fold: (el) => { const k = el.dataset.stage, o = new Set(openStages()); o.has(k) ? o.delete(k) : o.add(k); localStorage.setItem("pivot.lib.open", JSON.stringify([...o])); viewLibrary(); },
  "note-edit": () => {
    const s = curSession();
    openSheet(`<h2>${s.notes ? "עריכת הערה" : "הוספת הערה"}</h2><form id="nf"><div class="field"><label for="nt">הערות לאימון</label><textarea id="nt" rows="6" placeholder="מה עבד, מי התבלט, מה לשפר בפעם הבאה">${esc(s.notes || "")}</textarea></div>
      <div class="sheet-actions sticky"><button class="btn ball block" type="submit">שמירה</button><button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
    () => { $("#nt").focus(); $("#nf").addEventListener("submit", async (e) => { e.preventDefault(); s.notes = $("#nt").value.trim(); await commitSession(s); closeSheet(); toast("ההערה נשמרה"); route(); }); });
  },
  "drill-new": (el) => drillForm({}, el.dataset.stage),
  "drill-edit": (el) => drillForm(store.get("drills", el.dataset.id)),
  export: () => {
    const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `pivot-backup-${todayStr()}.json` });
    a.click(); URL.revokeObjectURL(a.href); localStorage.setItem("pivot.lastBackup", Date.now()); toast("הגיבוי הורד"); viewSettings();
  },
  import: () => $("#file").click(),
  install: async () => { deferredInstall?.prompt(); deferredInstall = null; },
  "timer-run": () => runTimer(stepsOf(planOf(curSession()))),
  "timer-quick": () => quickTimerSheet(),
  teams: () => { const s = curSession(), g = store.get("groups", s.groupId), all = playersOf(s.groupId), here = all.filter((p) => s.attendance?.[p.id]); teamsSheet(here.length >= 2 ? here : all, groupColor(g)); },
  "plan-print": () => { const id = location.hash.split("/")[2], s = store.get("sessions", id), pl = planOf(s); if (!pl) return toast("אין תוכנית להדפסה");
    printPlan({ group: store.get("groups", s.groupId), date: s.date, present: presentCount(s), plan: pl, notes: s.notes }); },
  "summary-share": () => { const s = store.get("sessions", location.hash.split("/")[2]); shareSheet("הודעה להורים", sessionMessage(store.get("groups", s.groupId), s, planOf(s))); },
  "star-share": () => { const g = store.get("groups", curGid()), a = store.get("awards", `${g.id}_${starMonth}`), p = a && store.get("players", a.playerId); if (p) shareSheet("הודעה על מצטיין החודש", starMessage(g, p, starMonth, a.note)); },
  "group-ics": () => exportGroupIcs(store.get("groups", curGid())),
  assess: (el) => assessSheet(store.get("players", el.dataset.id)),
  "badge-give": (el) => badgeSheet(store.get("players", el.dataset.id)),
  "badge-quick": async (el) => { const p = store.get("players", el.dataset.id); await store.save("badges", { playerId: p.id, groupId: p.groupId, type: el.dataset.t, date: todayStr(), note: "" }); toast("התגית הוענקה"); },
  "badge-del": async (el) => { if (confirm("להסיר את התגית?")) await store.remove("badges", el.dataset.id); },
  "match-new": () => matchForm(store.get("groups", curGid()), {}, (m) => shareSheet("הודעה להורים", matchMessage(store.get("groups", m.groupId), m))),
  "match-edit": (el) => { const m = store.get("matches", el.dataset.id); matchForm(store.get("groups", m.groupId), m, (mm) => shareSheet("הודעה להורים", matchMessage(store.get("groups", mm.groupId), mm))); },
  "share-invite": async () => {
    try { const code = await store.share.createInvite();
      openSheet(`<h2>קוד הזמנה</h2><p>שלחו את הקוד למאמן השני. הוא פועל פעם אחת בלבד.</p><div class="code">${code}</div>
        <div class="sheet-actions"><button class="btn ball block" id="wcode">שליחה בווטסאפ</button><button class="btn ghost block" data-close>סגירה</button></div>`,
      () => $("#wcode").onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(`הצטרפו אליי לניהול הקבוצות בפיבוט. בהגדרות בוחרים "הצטרפות עם קוד" ומקלידים: ${code}`), "_blank", "noopener"));
    } catch (e) { toast("יצירת הקוד נכשלה: " + (e.code || e.message)); }
  },
  "share-join": () => openSheet(`<h2>הצטרפות עם קוד</h2><form id="jf"><div class="field"><label for="jc">הקוד שקיבלתם</label><input id="jc" required autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em;text-align:center"></div>
      <div class="sheet-actions sticky"><button class="btn ball block" type="submit">הצטרפות</button><button class="btn ghost block" type="button" data-close>ביטול</button></div></form>`,
    () => $("#jf").addEventListener("submit", async (e) => { e.preventDefault();
      try { const r = await store.share.join($("#jc").value); closeSheet(); toast("הצטרפתם. אפשר לעבור למרחב של " + (r.ownerName || "המאמן")); fillShareBox(); } catch (er) { toast(er.message || "ההצטרפות נכשלה"); } })),
  "ws-switch": async (el) => { await store.switchWorkspace(el.dataset.base); toast("עברתם מרחב עבודה"); go("#/"); },
  "member-rm": async (el) => { if (confirm("להסיר את המאמן? הוא לא יראה יותר את הנתונים שלכם.")) { await store.share.removeMember(el.dataset.uid); fillShareBox(); } },
  "ws-leave": async (el) => { if (!confirm("לעזוב את המרחב המשותף?")) return; if (store.workspace.base === el.dataset.base) await store.switchWorkspace(store.user.uid); await store.share.leave(el.dataset.base); fillShareBox(); }
};

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) return closeSheet();
  const g = e.target.closest("[data-go]"); if (g) return go(g.dataset.go);
  const a = e.target.closest("[data-act]"); if (a) actions[a.dataset.act]?.(a);
});
document.addEventListener("change", async (e) => {
  if (e.target.dataset.actChange === "star-month") { starMonth = e.target.value; return route(); }
  if (e.target.id !== "file" || !e.target.files[0]) return;
  try { await store.importAll(JSON.parse(await e.target.files[0].text())); toast("הנתונים שוחזרו"); }
  catch (err) { toast(err.message || "הקובץ לא תקין"); }
});


/* ---------- יכולות חדשות: התראת בריאות, תזכורות, משחקים, פרופיל ילד, שיתוף ---------- */
function healthBanner(players) {
  const list = players.filter((p) => p.health);
  if (!list.length) return "";
  return `<section class="health"><h3>${ICON.alert} שימו לב לפני האימון</h3>${list.map((p) => `<div><b>${esc(p.name)}</b>: ${esc(p.health)}</div>`).join("")}</section>`;
}
function wsBanner() {
  return store.workspace.own ? "" : `<div class="note" style="margin-bottom:14px">אתם עובדים כעת בנתונים המשותפים של מאמן אחר. <button class="btn small ghost" data-act="ws-switch" data-base="${store.user.uid}" style="margin-inline-start:8px">חזרה לנתונים שלי</button></div>`;
}
function remindersCard(groups) {
  const items = [], now = new Date(), today = todayStr(), tmr = new Date(now.getTime() + 864e5), tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, "0")}-${String(tmr.getDate()).padStart(2, "0")}`;
  for (const g of groups) {
    for (const x of scheduleOf(g)) {
      if (x.day === now.getDay()) items.push(`היום אימון: ${g.name}${x.time ? " ב-" + x.time : ""}`);
      else if (x.day === tmr.getDay()) items.push(`מחר אימון: ${g.name}${x.time ? " ב-" + x.time : ""}`);
    }
    for (const p of playersOf(g.id)) {
      if (p.birth && p.birth.slice(5) === today.slice(5)) items.push(`יום הולדת היום: ${p.name} (${g.name})`);
      else if (p.birth && p.birth.slice(5) === tmrStr.slice(5)) items.push(`מחר יום הולדת: ${p.name} (${g.name})`);
    }
  }
  const weekEnd = new Date(now.getTime() + 7 * 864e5).toISOString().slice(0, 10);
  for (const m of store.all("matches").filter((x) => x.date >= today && x.date <= weekEnd && !matchResult(x)).sort((a, b) => a.date.localeCompare(b.date))) {
    const g = store.get("groups", m.groupId); items.push(`משחק ${m.date === today ? "היום" : "ב-" + fmtShort(m.date)}: ${g?.name || ""}${m.opponent ? " נגד " + m.opponent : ""}${m.time ? " ב-" + m.time : ""}`);
  }
  const last = +localStorage.getItem("pivot.lastBackup") || 0;
  if (groups.length && (!last || Date.now() - last > 14 * 864e5)) items.push(`<a href="#/settings">כדאי לגבות את הנתונים לקובץ</a>`);
  if (!items.length) return "";
  return `<section class="remind"><h3>${ICON.bell} תזכורות</h3>${items.map((t) => `<div>${/^<a/.test(t) ? t : esc(t)}</div>`).join("")}</section>`;
}
function matchesView(g) {
  const ms = store.all("matches").filter((m) => m.groupId === g.id).sort((a, b) => a.date.localeCompare(b.date)), today = todayStr();
  const up = ms.filter((m) => m.date >= today && !matchResult(m)), past = ms.filter((m) => !up.includes(m)).reverse();
  const rec = { win: 0, draw: 0, loss: 0 }; let gf = 0, ga = 0;
  for (const m of past) { const r = matchResult(m); if (r) { rec[r]++; gf += +m.ourScore; ga += +m.theirScore; } }
  const row = (m) => { const r = matchResult(m);
    return `<button class="row" data-act="match-edit" data-id="${m.id}"><span class="grow"><div class="name">${m.opponent ? "נגד " + esc(m.opponent) : MATCH_KINDS[m.kind] || "משחק"}</div>
      <div class="sub">${fmtDate(m.date)}${m.time ? " · " + esc(m.time) : ""}${m.place ? " · " + esc(m.place) : ""} · ${MATCH_KINDS[m.kind] || ""}</div></span>
      ${r ? `<span class="res ${r}">${m.ourScore}:${m.theirScore} ${RESULT_LABEL[r]}</span>` : `<span class="chip">${ICON.cal}</span>`}</button>`; };
  const summary = past.some(matchResult) ? `<div class="kpis"><div class="kpi"><b>${rec.win}</b><span>ניצחונות</span></div><div class="kpi"><b>${rec.draw}</b><span>תיקו</span></div><div class="kpi"><b>${rec.loss}</b><span>הפסדים</span></div></div>
    <p class="sub" style="text-align:center;margin:-4px 0 14px">שערים: ${gf} בעד, ${ga} נגד</p>` : "";
  return `<button class="btn ball block" data-act="match-new" style="margin-bottom:16px">${ICON.trophy} משחק חדש</button>${summary}
    ${up.length ? `<div class="section-title"><h2>משחקים קרובים</h2></div><div class="card">${up.map(row).join("")}</div>` : ""}
    ${past.length ? `<div class="section-title"><h2>משחקים שהיו</h2></div><div class="card">${past.map(row).join("")}</div>` : ""}
    ${!ms.length ? `<div class="card empty"><h3>עוד אין משחקים</h3><p>הוסיפו משחק או טורניר כדי לעקוב אחרי תוצאות, ציוד והודעות להורים.</p></div>` : ""}`;
}
function viewPlayer(pid) {
  live = true;
  const p = store.get("players", pid); if (!p) return go("#/");
  const g = store.get("groups", p.groupId), col = groupColor(g), as = assessmentsOf(pid), last = as.at(-1), prev = as.at(-2);
  const bs = store.all("badges").filter((b) => b.playerId === pid).sort((a, b) => b.date.localeCompare(a.date));
  const r = rate(pid, p.groupId), age = ageOf(p.birth), ss = sessionsOf(p.groupId);
  const sug = []; const has = (t) => bs.some((b) => b.type === t);
  if (ss.length >= 4 && r === 100 && !has("attend")) sug.push("attend");
  if (p.createdAt && Date.now() - p.createdAt < 30 * 864e5 && !has("newbie")) sug.push("newbie");
  if (last && prev && avgOf(last.skills) - avgOf(prev.skills) >= 0.5 && !has("improve")) sug.push("improve");
  const graph = () => {
    if (as.length < 2) return `<p class="sub" style="margin:0">הוסיפו לפחות שתי הערכות בזמנים שונים כדי לראות גרף התקדמות.</p>`;
    const W = 300, H = 110, pts = as.slice(-8).map((a, i, arr) => [arr.length === 1 ? W / 2 : 14 + (i * (W - 28)) / (arr.length - 1), H - 12 - ((avgOf(a.skills) - 1) / 4) * (H - 28), a]);
    return `<svg viewBox="0 0 ${W} ${H}" class="graph" role="img" aria-label="התקדמות כללית">${[1, 3, 5].map((v) => { const y = H - 12 - ((v - 1) / 4) * (H - 28); return `<line x1="8" x2="${W - 8}" y1="${y}" y2="${y}" stroke="#d9dfe8" stroke-dasharray="3 4"/>`; }).join("")}
      <polyline fill="none" stroke="${col}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.map((q) => q[0] + "," + q[1]).join(" ")}"/>
      ${pts.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="#fff" stroke="${col}" stroke-width="3"/>`).join("")}</svg>
      <div class="sub" style="display:flex;justify-content:space-between"><span>${fmtShort(pts[0][2].date)}</span><span>${fmtShort(pts.at(-1)[2].date)}</span></div>`;
  };
  const skillRows = last ? Object.keys(FOCUS).filter((k) => last.skills[k]).map((k) => { const d = prev?.skills?.[k] ? last.skills[k] - prev.skills[k] : 0;
    return `<div class="skill"><span>${FOCUS[k]}</span><span class="dots">${[1, 2, 3, 4, 5].map((v) => `<i class="${v <= last.skills[k] ? "on" : ""}" style="--c:${col}"></i>`).join("")}</span><small class="${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "+" + d : d < 0 ? d : ""}</small></div>`; }).join("") : "";
  page(hero({ title: p.name, sub: [g?.name, age != null ? "גיל " + age : ""].filter(Boolean).join(" · "), back: `#/g/${p.groupId}`, compact: true }),
    `<div class="pcard">${avatar(p, col)}<div class="kpis" style="margin:0;flex:1"><div class="kpi"><b>${r === null ? "-" : r + "%"}</b><span>נוכחות</span></div><div class="kpi"><b>${starsOf(pid)}</b><span>מצטיין חודש</span></div><div class="kpi"><b>${bs.length}</b><span>תגיות</span></div></div></div>
    ${p.health ? `<section class="health"><h3>${ICON.alert} רגישות בריאותית</h3><div>${esc(p.health)}</div></section>` : ""}
    <section class="card statcard"><h3>כישורים</h3>${skillRows || `<p class="sub" style="margin:0 0 4px">עוד אין הערכה. דרגו כל כישור מ-1 עד 5.</p>`}
      <div style="margin:12px 0 4px">${graph()}</div><button class="btn small ball" data-act="assess" data-id="${pid}">${last ? "הערכה חדשה" : "הערכת כישורים"}</button></section>
    <section class="card statcard"><h3>תגיות הצלחה</h3>
      ${sug.length ? `<div class="sug">מגיע לו? ${sug.map((t) => `<button class="btn small ghost" data-act="badge-quick" data-id="${pid}" data-t="${t}">${BADGES[t].label}</button>`).join("")}</div>` : ""}
      ${bs.length ? `<div class="badges">${bs.map((b) => `<button class="badge" data-act="badge-del" data-id="${b.id}" title="הסרה">${badgeDot(b.type, 34)}<b>${BADGES[b.type]?.label || ""}</b><small>${fmtShort(b.date)}${b.note ? " · " + esc(b.note) : ""}</small></button>`).join("")}</div>` : `<p class="sub" style="margin:0 0 8px">עוד לא חולקו תגיות.</p>`}
      <button class="btn small ball" data-act="badge-give" data-id="${pid}">${ICON.medal} חלוקת תגית</button></section>
    ${p.notes ? `<section class="card statcard"><h3>הערות מאמן</h3><p style="margin:0;white-space:pre-wrap">${esc(p.notes)}</p></section>` : ""}
    ${p.parentPhone ? `<div class="contact" style="margin-top:12px"><a class="btn small" href="tel:${esc(p.parentPhone)}">התקשרות ל${esc(p.parentName || "הורה")}</a><a class="btn small ghost" target="_blank" rel="noopener" href="${waLink(p.parentPhone)}">וואטסאפ</a></div>` : ""}
    <button class="btn ghost block" data-act="player-edit" data-id="${pid}" style="margin-top:16px">עריכת פרטי הילד</button>`, "groups");
}
async function fillShareBox() {
  const box = $("#shareBox"); if (!box) return;
  try {
    const [mem, ws] = await Promise.all([store.share.members(), store.share.workspaces()]), own = store.workspace.own;
    box.innerHTML = `<p style="margin-top:0">אפשר להזמין מאמן נוסף שיראה וידווח על אותן קבוצות, בזמן אמת. כל אחד נכנס עם החשבון שלו.</p>
      <div class="two"><button class="btn ball" data-act="share-invite">קוד הזמנה</button><button class="btn ghost" data-act="share-join">הצטרפות עם קוד</button></div>
      ${mem.length ? `<h4 class="mini">מאמנים שיש להם גישה לנתונים שלי</h4>${mem.map((m) => `<div class="mrow"><span>${esc(m.name || m.email || "מאמן")}</span><button class="btn small danger" data-act="member-rm" data-uid="${m.uid}">הסרה</button></div>`).join("")}` : ""}
      ${ws.length || !own ? `<h4 class="mini">מרחבי עבודה</h4>
        <div class="mrow"><span>הנתונים שלי ${own ? "(פעיל)" : ""}</span>${own ? "" : `<button class="btn small" data-act="ws-switch" data-base="${store.user.uid}">מעבר</button>`}</div>
        ${ws.map((w) => `<div class="mrow"><span>הנתונים של ${esc(w.ownerName || "מאמן")} ${store.workspace.base === w.ownerUid ? "(פעיל)" : ""}</span><span>${store.workspace.base === w.ownerUid ? "" : `<button class="btn small" data-act="ws-switch" data-base="${w.ownerUid}">מעבר</button> `}<button class="btn small danger" data-act="ws-leave" data-base="${w.ownerUid}">עזיבה</button></span></div>`).join("")}` : ""}`;
  } catch (e) { box.innerHTML = `<p class="sub" style="margin:0">לא הצלחנו לטעון את פרטי השיתוף (${esc(e.code || e.message)}). בדקו שפרסמתם את כללי האבטחה החדשים ב-Firebase.</p>`; }
}

/* ---------- הפעלה ---------- */
async function afterLogin() {
  // טעינת ספריית התרגילים בפעם הראשונה (מזהים קבועים, אז אין כפילויות) ושדרוג תוכניות מגרסה 1
  const key = "pivot.seeded." + store.user.uid;
  if (!store.all("drills").length && !localStorage.getItem(key)) { for (const d of SEED_DRILLS) store.save("drills", { ...d }); localStorage.setItem(key, "1"); }
  await store.upgradeLegacy();
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
store.start(async (u) => { if (u) await afterLogin(); ready = true; route(); })
  .catch((e) => { app.innerHTML = `<div class="login"><h1>אופס</h1><p>לא הצלחנו לטעון. בדקו חיבור לאינטרנט ורעננו.</p><small>${esc(e.message)}</small></div>`; });
