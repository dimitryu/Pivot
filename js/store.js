// שכבת נתונים אחת עם שני מנועים: Firebase (ענן) או מקומי (localStorage).
// שאר האפליקציה מדברת רק עם store, ולכן אפשר להחליף מנוע בלי לגעת בממשק.
import { firebaseConfig, isConfigured } from "./firebase-config.js";

export const SCHEMA_VERSION = 3;
export const COLLECTIONS = ["groups", "players", "sessions", "plans", "drills", "awards", "assessments", "badges", "matches"];

const listeners = new Set();
const data = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
let engine = null;
let currentUser = null;
let workspace = { base: null, own: true };
const wsKey = (uid) => "pivot.ws." + uid;
const push = (c, rows) => { data[c] = rows; emit(); };

export const store = {
  isCloud: isConfigured,
  get user() { return currentUser; },
  get workspace() { return workspace; },
  // שיתוף בין מאמנים (ענן בלבד): קוד הזמנה, חברים ומעבר בין מרחבי עבודה
  share: {
    supported: () => isConfigured,
    createInvite: () => engine.createInvite(currentUser.displayName || currentUser.email || ""),
    join: (code) => engine.join(code, currentUser.displayName || "", currentUser.email || ""),
    members: () => engine.members(),
    removeMember: (uid) => engine.removeMember(uid),
    workspaces: () => engine.workspaces(),
    leave: (owner) => engine.leave(owner)
  },
  async switchWorkspace(base) {
    if (base === currentUser.uid) localStorage.removeItem(wsKey(currentUser.uid)); else localStorage.setItem(wsKey(currentUser.uid), base);
    workspace = { base, own: base === currentUser.uid };
    await engine.attach(currentUser, push, base);
    emit();
  },
  all: (c) => data[c],
  get: (c, id) => data[c].find((x) => x.id === id),
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  newId: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),

  async save(c, obj) {
    if (!obj.id) obj.id = store.newId();
    obj.updatedAt = Date.now();
    const i = data[c].findIndex((x) => x.id === obj.id);
    if (i >= 0) data[c][i] = obj; else data[c].push(obj);
    emit();
    await engine.save(c, obj);
    return obj;
  },
  async remove(c, id) {
    data[c] = data[c].filter((x) => x.id !== id);
    emit();
    await engine.remove(c, id);
  },
  // מחיקת קבוצה כוללת את כל הילדים והאימונים שלה
  async removeGroup(gid) {
    for (const p of data.players.filter((x) => x.groupId === gid)) await store.remove("players", p.id);
    for (const s of data.sessions.filter((x) => x.groupId === gid)) await store.remove("sessions", s.id);
    await store.remove("groups", gid);
  },

  exportAll() {
    return { app: "pivot", schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), ...structuredClone(data) };
  },
  async importAll(json) {
    if (!json || json.app !== "pivot") throw new Error("הקובץ לא שייך לאפליקציה");
    const migrated = migrate(json);
    for (const c of COLLECTIONS) for (const o of migrated[c] || []) await store.save(c, o);
    await store.upgradeLegacy();
  },
  // גרסה 1 שמרה בתוך כל תוכנית רשימת תרגילים. מעבירים אותם לספריית התרגילים (שלב "יסודות") ומחליפים במזהים.
  async upgradeLegacy() {
    for (const p of data.plans.filter((x) => Array.isArray(x.drills))) {
      const ids = [];
      for (const d of p.drills.filter((x) => x.name)) {
        const saved = await store.save("drills", { stage: "basics", name: d.name, minutes: +d.minutes || 10, desc: d.desc || "", focus: "", min: 0 });
        ids.push(saved.id);
      }
      const { drills, ...rest } = p;
      await store.save("plans", { ...rest, stages: { warmup: [], minigame: [], basics: ids, finale: [] } });
    }
  },

  async signIn() { return engine.signIn(); },
  async signOut() { await engine.signOut(); },
  // מחזיר Promise שנפתר כשיש כבר מצב התחברות ידוע
  start(onAuth) {
    return (isConfigured ? firebaseEngine() : localEngine()).then((e) => {
      engine = e;
      e.onAuth(async (u) => {
        currentUser = u;
        if (u) {
          const base = (isConfigured && localStorage.getItem(wsKey(u.uid))) || u.uid;
          workspace = { base, own: base === u.uid };
          await e.attach(u, push, base);
        } else COLLECTIONS.forEach((c) => (data[c] = []));
        emit();
        onAuth(u);
      });
    });
  }
};

function emit() { listeners.forEach((f) => f()); }

// מקום לשדרוגי מבנה בגרסאות עתידיות: כשמשנים שדות, מעלים SCHEMA_VERSION ומוסיפים שלב כאן.
function migrate(json) {
  const out = structuredClone(json);
  // if ((out.schemaVersion || 1) < 2) { ... }
  return out;
}

/* ---------- מנוע מקומי ---------- */
async function localEngine() {
  const KEY = "pivot.local.v1";
  let cb = null;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const write = (o) => localStorage.setItem(KEY, JSON.stringify(o));
  return {
    onAuth(fn) { fn(localStorage.getItem("pivot.local.on") ? { uid: "local", displayName: "", email: "" } : null); },
    async signIn() { localStorage.setItem("pivot.local.on", "1"); location.reload(); },
    async signOut() { localStorage.removeItem("pivot.local.on"); location.reload(); },
    async attach(u, push) {
      cb = push;
      const db = read();
      COLLECTIONS.forEach((c) => push(c, db[c] || []));
    },
    async save(c, obj) { const db = read(); db[c] = (db[c] || []).filter((x) => x.id !== obj.id).concat(obj); write(db); },
    async remove(c, id) { const db = read(); db[c] = (db[c] || []).filter((x) => x.id !== id); write(db); }
  };
}

/* ---------- מנוע Firebase ---------- */
async function firebaseEngine() {
  const V = "10.14.1";
  const base = `https://www.gstatic.com/firebasejs/${V}`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.initializeFirestore(app, {
    localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() })
  });
  let uid = null, wsBase = null;
  const col = (c) => F.collection(db, "users", wsBase, c);
  const code8 = () => Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const unsubs = [];
  return {
    onAuth(fn) { A.onAuthStateChanged(auth, (u) => fn(u ? { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL } : null)); },
    async signIn() {
      const p = new A.GoogleAuthProvider();
      try { await A.signInWithPopup(auth, p); }
      catch (e) {
        if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") return A.signInWithRedirect(auth, p);
        if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") throw e;
      }
    },
    async signOut() { unsubs.splice(0).forEach((u) => u()); await A.signOut(auth); },
    async attach(u, push, b) {
      uid = u.uid; wsBase = b || u.uid;
      unsubs.splice(0).forEach((x) => x());
      if (wsBase === uid) await F.setDoc(F.doc(db, "users", uid), { schemaVersion: SCHEMA_VERSION, email: u.email || "", lastSeen: Date.now() }, { merge: true });
      let first = COLLECTIONS.length;
      await new Promise((resolve) => {
        COLLECTIONS.forEach((c) => {
          unsubs.push(F.onSnapshot(col(c), (snap) => {
            push(c, snap.docs.map((d) => ({ ...d.data(), id: d.id })));
            if (first > 0 && --first === 0) resolve();
          }, (err) => {
            // הוסרתי ממרחב משותף: חוזרים אוטומטית לנתונים שלי
            if (wsBase !== uid && err.code === "permission-denied") { localStorage.removeItem("pivot.ws." + uid); location.reload(); }
            if (first > 0 && --first === 0) resolve();
          }));
        });
      });
    },
    // לא מחכים לאישור השרת: המטמון המקומי מתעדכן מיד והסנכרון קורה ברקע (גם בלי אינטרנט)
    async createInvite(ownerName) { const code = code8(); await F.setDoc(F.doc(db, "invites", code), { owner: uid, ownerName, used: false, createdAt: Date.now() }); return code; },
    async join(code, name, email) {
      code = code.trim().toUpperCase();
      const snap = await F.getDoc(F.doc(db, "invites", code));
      if (!snap.exists()) throw new Error("הקוד לא נמצא");
      const inv = snap.data();
      if (inv.used) throw new Error("הקוד כבר נוצל. בקשו קוד חדש");
      if (inv.owner === uid) throw new Error("זה הקוד שיצרתם בעצמכם");
      await F.setDoc(F.doc(db, "users", inv.owner, "members", uid), { code, name, email, joinedAt: Date.now() });
      await F.updateDoc(F.doc(db, "invites", code), { used: true, joiner: uid });
      await F.setDoc(F.doc(db, "users", uid, "workspaces", inv.owner), { ownerUid: inv.owner, ownerName: inv.ownerName || "" });
      return { ownerUid: inv.owner, ownerName: inv.ownerName || "" };
    },
    async members() { return (await F.getDocs(F.collection(db, "users", uid, "members"))).docs.map((d) => ({ uid: d.id, ...d.data() })); },
    async removeMember(m) { await F.deleteDoc(F.doc(db, "users", uid, "members", m)); },
    async workspaces() { return (await F.getDocs(F.collection(db, "users", uid, "workspaces"))).docs.map((d) => d.data()); },
    async leave(owner) { await F.deleteDoc(F.doc(db, "users", owner, "members", uid)); await F.deleteDoc(F.doc(db, "users", uid, "workspaces", owner)); },
    async save(c, obj) { const { id, ...rest } = obj; F.setDoc(F.doc(db, "users", wsBase, c, id), rest).catch((e) => console.error("save failed", e)); },
    async remove(c, id) { F.deleteDoc(F.doc(db, "users", wsBase, c, id)).catch((e) => console.error("delete failed", e)); }
  };
}
