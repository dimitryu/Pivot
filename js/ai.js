// עוזר AI לבניית מערך אימון. קורא ישירות ל-Anthropic API מהדפדפן עם מפתח שהמאמן שומר במכשיר שלו.
// פרטיות: נשלחים רק שמות תרגילים, מספר ילדים וסיכום אימונים אחרונים. שמות ילדים והערות לא נשלחים.
import { STAGES, FOCUS } from "./lib.js";
import { snapOf, emptyStages } from "./planner.js";

const KEY = "pivot.ai.key", MODEL = "pivot.ai.model";
export const MODELS = [["claude-haiku-5-5", "מהיר וזול (Haiku)"], ["claude-sonnet-5-5", "איכותי יותר (Sonnet)"]];
export const aiKey = () => localStorage.getItem(KEY) || "";
export const setAiKey = (k) => (k ? localStorage.setItem(KEY, k.trim()) : localStorage.removeItem(KEY));
export const aiModel = () => localStorage.getItem(MODEL) || MODELS[0][0];
export const setAiModel = (m) => localStorage.setItem(MODEL, m);

const SYSTEM = `אתה עוזר למאמן כדור יד לילדים בגילאי 6–8. אתה בונה מערך אימון בעברית פשוטה, מבוסס משחק, בטוח ומשעשע, שבו כל הילדים פעילים ואף אחד לא מחכה בתור זמן רב.
המערך בנוי מארבעה שלבים: warmup (חימום), minigame (משחקון קטן), basics (יסודות המשחק), finale (משחק סיום).
העדף תרגילים מהספרייה שקיבלת (לפי id). מותר להוסיף תרגיל חדש כשאין התאמה, עם שם, דקות, הסבר קצר ותחום.
החזר JSON בלבד, בלי טקסט לפניו או אחריו, בפורמט:
{"title":"שם קצר למערך","summary":"שתי שורות למאמן: מה הרעיון של האימון","stages":{"warmup":[{"id":"..","why":"סיבה קצרה"}],"minigame":[],"basics":[],"finale":[]},"tips":["טיפ קצר למאמן","..."]}
תרגיל חדש נראה כך: {"name":"..","minutes":10,"desc":"..","focus":"pass|dribble|shoot|defense|team|move","why":".."}
כללים: היה תמציתי מאוד: "why" עד 6 מילים, "desc" של תרגיל חדש עד משפט אחד, "summary" עד שני משפטים; כל ארבעת השלבים חייבים להופיע; סך הדקות קרוב ליעד; לא יותר משלושה תרגילים בשלב; עד שלושה טיפים.`;

export async function aiBuildPlan({ drills, groupName, ages, present, minutes, request, recent }) {
  const key = aiKey();
  if (!key) throw new Error("חסר מפתח API");
  const lib = drills.map((d) => `${d.id} | ${STAGES.find((s) => s.k === d.stage)?.label} | ${d.name} | ${d.minutes} דק׳ | ${FOCUS[d.focus] || "-"}${d.min ? ` | מינימום ${d.min} ילדים` : ""}`).join("\n");
  const user = `קבוצה: ${groupName || ""}${ages ? `, גילאים ${ages}` : ""}
מספר ילדים באימון: ${present}
משך האימון: ${minutes} דקות
בקשת המאמן: ${request || "אין בקשה מיוחדת"}
אימונים אחרונים של הקבוצה (מהחדש לישן):
${recent.length ? recent.join("\n") : "אין עדיין"}

ספריית התרגילים (id | שלב | שם | זמן | תחום):
${lib}`;

  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 60000);
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: aiModel(), max_tokens: 4096, system: SYSTEM, messages: [{ role: "user", content: user }] })
    });
  } catch (e) { throw new Error(e.name === "AbortError" ? "הבקשה ארכה יותר מדי, נסו שוב" : "אין חיבור לשרת ה-AI. בדקו אינטרנט"); }
  finally { clearTimeout(timer); }
  if (res.status === 401) throw new Error("המפתח לא תקין. בדקו בהגדרות");
  if (res.status === 429) throw new Error("יותר מדי בקשות או שנגמרה המכסה. נסו עוד רגע");
  if (!res.ok) throw new Error("שגיאה משרת ה-AI (" + res.status + ")");
  const data = await res.json();
  const text = data.content?.map((c) => c.text || "").join("") || "";
  const out = parseJson(text);
  if (!out) { console.warn("AI raw response:", data.stop_reason, text); throw new Error(`ה-AI החזיר תשובה לא קריאה (${data.stop_reason || "?"}). נסו שוב`); }

  const stages = emptyStages();
  for (const s of STAGES) for (const it of (out.stages?.[s.k] || []).slice(0, 3)) {
    const lib1 = it.id && drills.find((d) => d.id === it.id);
    if (lib1) stages[s.k].push(snapOf(lib1, it.why || ""));
    else if (it.name) stages[s.k].push({ id: "ai-" + Math.random().toString(36).slice(2, 8), name: String(it.name), minutes: +it.minutes || 10, desc: String(it.desc || ""), focus: FOCUS[it.focus] ? it.focus : "", why: String(it.why || "") });
  }
  if (!Object.values(stages).flat().length) throw new Error("ה-AI לא החזיר תרגילים. נסו שוב");
  return { mode: "ai", title: String(out.title || "מערך AI"), summary: String(out.summary || ""), tips: (out.tips || []).slice(0, 3).map(String), stages, request, minutes };
}

// מנסה לקרוא JSON גם כשהתשובה עטופה בטקסט או נקטעה באמצע: חותך לנקודה האחרונה שאפשר לסגור ממנה
function parseJson(text) {
  const start = text.indexOf("{"); if (start < 0) return null;
  const body = text.slice(start);
  try { return JSON.parse(body.slice(0, body.lastIndexOf("}") + 1)); } catch { /* ממשיכים לתיקון */ }
  const stack = []; let inStr = false, esc = false, best = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") { stack.pop(); best = { end: i + 1, closers: stack.slice().reverse().join("") }; }
  }
  if (!best) return null;
  try { return JSON.parse(body.slice(0, best.end) + best.closers); } catch { return null; }
}
