# Go-live setup — Firebase + Cloudflare (free / Spark plan)

Everything in the repo is already **deploy-ready**. These are the one-time steps only
you can do (they need your Google / Cloudflare login). Nothing here puts a secret in the
code — secrets live in GitHub/Cloudflare encrypted stores.

Architecture (no Blaze plan needed):

```
Dashboard (web/)  ──Firebase Hosting──┐
Staff login       ──Firebase Auth─────┤
Business data     ──Firestore─────────┤   all free (Spark)
Push lock/unlock  ──FCM───────────────┘
Privileged backend──Cloudflare Worker (free)  ← holds the service-account secret
Android app       ──> calls the Worker for its lock status
```

---

## 1. Create the Firebase project (clicks)

1. Go to **console.firebase.google.com**, sign in with your **Ozzun** Google account.
2. **Add project** → name `ozzun-emi-locker` → Analytics **off** → Create.
3. **Build → Firestore Database** → *Create database* → **Production mode** → region `asia-south1`.
4. **Build → Authentication** → *Get started* → enable **Email/Password** (and **Google** if you want Google sign-in).
5. **Project settings (⚙) → Your apps → Web (`</>`)** → register app → copy the **firebaseConfig** values.

Paste those public values into `web/assets/firebase-config.js` (apiKey, authDomain, projectId, appId).
These are **not secrets** — safe to commit.

## 2. Create the admin + staff accounts

- In **Authentication → Users → Add user**, create your admin login (e.g. `nadeem@ozzun.com`).
- In **Firestore**, create a `staff` collection. Add a document whose **ID = the admin user's UID**
  (copy it from the Authentication users list) with fields:
  `{ name: "Nadeem", email: "nadeem@ozzun.com", role: "admin", active: true }`.
- Staff/managers are added the same way (role `staff` or `manager`). The dashboard's
  Staff page will do this for you once the Worker is wired.

## 3. Service account (the one real secret)

Firebase → **Project settings → Service accounts → Generate new private key** → downloads a JSON.
**Do NOT commit it or paste it in chat.** You will add it as a GitHub secret in step 5.

## 4. Cloudflare Worker (free)

1. Create a free account at **dash.cloudflare.com**.
2. Get your **Account ID** (Workers & Pages → right sidebar).
3. Create an **API token**: My Profile → API Tokens → *Create* → template **"Edit Cloudflare Workers"**.
4. Edit `worker/wrangler.toml`: set `FIREBASE_API_KEY` to your public web API key, and
   `ALLOWED_ORIGIN` to your hosting URL(s) (e.g. `https://ozzun-emi-locker.web.app`).

## 5. Add GitHub secrets → auto-deploy

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | the entire service-account JSON from step 3 |
| `CLOUDFLARE_API_TOKEN` | from step 4.3 |
| `CLOUDFLARE_ACCOUNT_ID` | from step 4.2 |

(Optional variable `FIREBASE_PROJECT_ID` if your project id isn't `ozzun-emi-locker`.)

Now **push to `master`** (or re-run the workflows): `Deploy Firebase` publishes the dashboard
+ Firestore rules; `Deploy Cloudflare Worker` publishes the backend and injects the service
account as a Worker secret. Before the secrets exist, these workflows **skip quietly** (no red X).

## 6. Point the app at the Worker

Set the Worker URL for the Android build (so the app knows where to check in):
`./gradlew :app:assembleDebug -PworkerUrl=https://emi-api.<your-subdomain>.workers.dev`
(or set a repo **variable**/secret `WORKER_URL` and reference it in the android workflow).

For FCM push (instant lock/unlock): download `google-services.json` from Firebase and we'll
wire the messaging module in the next step (it stays gitignored).

---

## What is already done & verified in code
- Secure Firestore rules (staff-only; device state is server-write-only).
- Worker lock-decision logic — unit-tested (8/8 passing).
- Per-device secret token (only its hash is stored); staff endpoints require a verified Firebase ID token.
- CORS limited to the dashboard origin; app talks HTTPS only.
- No secret is ever stored in the repo (scanned).
