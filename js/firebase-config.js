// הגדרות Firebase. הערכים כאן ציבוריים (לא סודיים) ומותר לשמור אותם בגיט.
// איך ממלאים: Firebase Console > Project settings > Your apps > Web app > Config.
// כל עוד הערכים הם YOUR_..., האפליקציה עובדת במצב מקומי (נתונים בדפדפן בלבד).
export const firebaseConfig = {
  apiKey: "AIzaSyBf35c-s-Zt2uWeuTlZo5JpywTnOkF5CC4",
  authDomain: "pivot-9e059.firebaseapp.com",
  projectId: "pivot-9e059",
  storageBucket: "pivot-9e059.firebasestorage.app",
  messagingSenderId: "628479639626",
  appId: "1:628479639626:web:298a9875494fadd26c66b3"
};

export const isConfigured = !String(firebaseConfig.apiKey).startsWith("YOUR_");
