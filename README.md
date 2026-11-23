# פיבוט – ניהול קבוצות כדור יד לילדים

PWA בעברית (RTL): עובדת באנדרואיד ובמחשב, מתקינים אותה על המסך הראשי.
יכולות: התחברות עם Google, כמה קבוצות לכל מאמן, כרטיס ילד, נוכחות באימון, תוכניות אימון, גיבוי ושחזור לקובץ.

## מבנה הקבצים
| קובץ | תפקיד |
|---|---|
| `index.html` | נקודת כניסה |
| `styles.css` | כל העיצוב (צבעים במשתנים בראש הקובץ) |
| `js/app.js` | המסכים והפעולות |
| `js/lib.js` | עזרים משותפים, אייקונים, שלבי אימון, הקטנת תמונה |
| `js/planner.js` | הגרלה והצעה חכמה לתוכנית אימון |
| `js/stats.js` | חישוב ותצוגת סטטיסטיקות |
| `js/store.js` | שכבת נתונים: ענן (Firebase) או מקומי. כאן גם `SCHEMA_VERSION` ו-`migrate` לשדרוגי מבנה |
| `js/firebase-config.js` | הגדרות הפרויקט שלך ב-Firebase |
| `js/seed.js` | ספריית 32 תרגילים התחלתית (8 לכל שלב) |
| `sw.js` | עבודה בלי אינטרנט. **להעלות את `VERSION` בכל עדכון** |
| `firestore.rules` | כללי אבטחה: כל מאמן רואה רק את הנתונים שלו |

## הקמה חד־פעמית (כ-10 דקות)
1. console.firebase.google.com ← Add project (אפשר בלי Analytics).
2. Build ← Authentication ← Get started ← Sign-in method ← Google ← Enable.
3. Build ← Firestore Database ← Create database (Production mode, אזור europe-west).
4. לשונית Rules ← להדביק את `firestore.rules` ← Publish.
5. Project settings ← Your apps ← Web (`</>`) ← להעתיק את ה-config לתוך `js/firebase-config.js`.
6. Authentication ← Settings ← Authorized domains ← להוסיף `dimitryu.github.io`.
7. GitHub: ריפו חדש, להעלות את כל הקבצים, Settings ← Pages ← Branch main ← Save.
   הכתובת: `https://dimitryu.github.io/<שם-הריפו>/`
8. בטלפון: לפתוח בכרום ← תפריט ← "התקנת אפליקציה".

## בדיקה מקומית
`python -m http.server 8000` בתיקייה, ואז http://localhost:8000
(עד שממלאים Firebase, האפליקציה עובדת במצב מקומי.)

## עדכון גרסה
1. לערוך קבצים. 2. להעלות `VERSION` ב-`sw.js`. 3. push. המכשירים מתעדכנים בפתיחה הבאה עם אינטרנט.
שינוי במבנה הנתונים: להעלות `SCHEMA_VERSION` ולהוסיף שלב ב-`migrate` (store.js).

## מבנה הנתונים
`users/{uid}/groups | players | sessions | plans | drills | awards` (אוספים שטוחים; לילד ולאימון יש `groupId`).
אימון שומר תמונת מצב של התוכנית (`plan`), כך ששינוי בספרייה לא משנה היסטוריה. גרסת מבנה: 2.
