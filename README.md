# EMI Locker — Device Financing / Installment Lock System

A legitimate, consent-based device-financing controller for a shop that sells phones
on installments (the same product category as PayJoy, Samsung Knox Guard, and Google's
Device Lock Controller). At the point of sale, with the customer's written consent, a
controller app is enrolled on the phone. If payments stop, the shop can lock the phone —
with a clear on-screen payment instruction and support number — until payment resumes.

**Design principles (built in, not optional):**
- The lock screen always shows how to pay and a support number, so a customer can always clear the lock.
- An enrollment/consent record (name, CNIC, plan) is captured at provisioning time.
- Nothing hidden or covert — the user knows the app is there and what it does.
- The **server** is the source of truth for paid/unpaid. The phone only asks; it never decides.

---

## Repository layout

```
EMI-Locker-APP/
├── android/      Android Studio project (Java) — the on-device controller (DPC)
├── server/       Node.js + Express backend + shop admin dashboard (SQLite)
└── .github/workflows/android-build.yml   Cloud APK build (GitHub Actions)
```

---

## Status — Step 1 (scaffold + build loop)

Done and verified:
- ✅ Android app builds to a debug APK (shows whether it is Device Owner).
- ✅ GitHub Actions builds the APK in the cloud and uploads it as an artifact.
- ✅ Node server: enroll, device check-in (server decides lock), lock/unlock/mark-paid.
- ✅ Shop dashboard to enroll and control devices.

**Not yet built** (added one at a time, each tested on a real phone first):
Device Owner provisioning → Lock Task (kiosk) lock screen → FRP → offline grace-lock →
FCM push → anti-tamper/root/emulator checks → Play Integrity → NDK secret layer.

---

## A) Build the APK in the cloud (recommended — no load on your PC)

1. Push this repo to GitHub (already wired to `JUTTSABBB/EMI-Locker-APP`).
2. Open the **Actions** tab → the **Build Android APK** workflow runs on every push.
3. When it finishes, open the run → **Artifacts** → download `emi-locker-debug-apk`.
4. Unzip → `app-debug.apk` → copy to your phone and install (allow "unknown sources").

You can also trigger it manually from the Actions tab (**Run workflow**).

## B) Build the APK locally (optional)

Requires Android Studio (or the Android SDK) installed.
```bash
cd android
./gradlew :app:assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## C) Open in Android Studio

Android Studio → **Open** → select the `android/` folder (not the repo root). Let Gradle
sync. The project targets compileSdk 35, minSdk 24, Java 17.

---

## D) Run the server + dashboard (on your PC)

```bash
cd server
npm install
npm run seed        # inserts one demo device (optional)
npm start           # http://localhost:4000
```
Open http://localhost:4000 for the shop dashboard. API: `/health`, `/api/enroll`,
`/api/checkin`, `/api/devices`, `/api/devices/:id/{lock,unlock,mark-paid}`.

> Step 1 has no dashboard login yet — run it only on your own machine/LAN. Authentication
> and CNIC encryption come in a later step.

---

## 🔬 Real-phone test checklist for Step 1

You must do these yourself (a build server cannot):

- [ ] Install `app-debug.apk` on a test phone. It opens and shows **"Not enrolled yet"**
      (because it is not the Device Owner — that is expected at this step).
- [ ] App icon and name show as **EMI Locker**.
- [ ] No crash on open or on rotate.

If all three pass, Step 1's build-and-install loop is confirmed and we move to
**Step 2: Device Owner provisioning** (the QR-at-setup flow that makes the app
un-installable). ColorOS (OPPO/Vivo) behaves differently from Samsung/Pixel here — we
will test on your actual target phones and add fallbacks where FRP is unreliable.
