// בניית תוכנית לאימון: מהתוכניות שלי, הגרלה או הצעה חכמה.
// "חכמה" כאן היא אלגוריתם מקומי ושקוף (לא מודל שפה): הוא מעדיף תרגילים שלא תורגלו לאחרונה
// ותחומים (מסירות, זריקה...) שתורגלו פחות באימונים האחרונים של הקבוצה, ומתחשב במספר הילדים.
import { STAGES, FOCUS } from "./lib.js";

const COUNT = { warmup: 1, minigame: 1, basics: 2, finale: 1 };
export const emptyStages = () => Object.fromEntries(STAGES.map((s) => [s.k, []]));
const snap = (d, why = "") => ({ id: d.id, name: d.name, minutes: +d.minutes || 0, desc: d.desc || "", focus: d.focus || "", why });
export const snapOf = snap;

export function stageMinutes(plan) {
  return Object.values(plan?.stages || {}).flat().reduce((a, d) => a + (+d.minutes || 0), 0);
}
export const stageList = (plan) => STAGES.map((s) => ({ ...s, drills: plan?.stages?.[s.k] || [] }));

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export function randomPlan(drills) {
  const stages = emptyStages();
  for (const s of STAGES) stages[s.k] = shuffle(drills.filter((d) => d.stage === s.k)).slice(0, COUNT[s.k]).map((d) => snap(d));
  return { mode: "random", title: "הגרלה", stages };
}

// תוכנית שנשמרה (מזהי תרגילים) -> תמונת מצב עם פרטי התרגילים
export function planFromSaved(plan, drills) {
  const stages = emptyStages();
  for (const s of STAGES) stages[s.k] = (plan.stages?.[s.k] || []).map((id) => drills.find((d) => d.id === id)).filter(Boolean).map((d) => snap(d));
  return { mode: "mine", planId: plan.id, title: plan.title, stages };
}

export function smartPlan(drills, pastSessions, playerCount) {
  const recent = pastSessions.filter((s) => s.plan).slice(0, 5);
  const usedWeight = (d) => recent.reduce((sum, s, i) => sum + (Object.values(s.plan.stages || {}).flat().some((x) => x.id === d.id || x.name === d.name) ? (i === 0 ? 3 : i === 1 ? 2 : 1) : 0), 0);
  const focusCount = {};
  recent.forEach((s) => Object.values(s.plan.stages || {}).flat().forEach((x) => { if (x.focus) focusCount[x.focus] = (focusCount[x.focus] || 0) + 1; }));
  const stages = emptyStages();
  const picked = new Set();
  for (const s of STAGES) {
    const scored = drills.filter((d) => d.stage === s.k).map((d) => {
      const used = usedWeight(d), fc = focusCount[d.focus] || 0;
      let score = -used * 2 - fc * 0.6 + Math.random() * 0.8;
      if (d.min && playerCount && playerCount < d.min) score -= 6;
      return { d, used, fc, score };
    }).sort((a, b) => b.score - a.score);
    const chosen = [];
    for (const c of scored) {
      if (chosen.length >= COUNT[s.k]) break;
      if (s.k === "basics" && chosen.some((x) => x.d.focus === c.d.focus)) continue; // שני תרגילי יסודות מתחומים שונים
      chosen.push(c);
    }
    stages[s.k] = chosen.map(({ d, used, fc }) => {
      picked.add(d.id);
      const why = used === 0 ? (recent.length ? "לא תורגל ב-5 האימונים האחרונים" : "") : "";
      const f = d.focus && (fc === 0 || fc <= 1) && recent.length ? `מחזק ${FOCUS[d.focus]}` : "";
      return snap(d, [why, f].filter(Boolean).join(" · "));
    });
  }
  return { mode: "smart", title: "הצעה חכמה", stages };
}

// החלפת תרגיל אחד בשלב: מגרילים תרגיל אחר מאותו שלב שעוד לא נמצא באימון
export function swapDrill(plan, stageKey, index, drills) {
  const inPlan = new Set(Object.values(plan.stages).flat().map((d) => d.id));
  const options = drills.filter((d) => d.stage === stageKey && !inPlan.has(d.id));
  if (!options.length) return false;
  plan.stages[stageKey][index] = snap(options[Math.floor(Math.random() * options.length)]);
  return true;
}
