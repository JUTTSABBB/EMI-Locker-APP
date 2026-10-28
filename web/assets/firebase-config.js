/* PUBLIC Firebase config — these values are NOT secrets and are safe to commit.
   Paste them from: Firebase Console -> Project settings -> Your apps -> Web app.
   While apiKey is empty, the dashboard runs in DEMO mode with sample data. */
window.FIREBASE_CONFIG = {
  apiKey: "",            // e.g. "AIzaSyB...."
  authDomain: "",        // e.g. "ozzun-emi-locker.firebaseapp.com"
  projectId: "",         // e.g. "ozzun-emi-locker"
  appId: ""              // e.g. "1:1234567890:web:abcdef"
};

/* Base URL of the Cloudflare Worker backend (lock/unlock, device check-in, FCM).
   e.g. "https://emi-api.<your-subdomain>.workers.dev" */
window.WORKER_URL = "";
