# EMI Locker — project handoff / continue-here notes

This file is the single place a new session (or a teammate) reads to pick up the work.
Everything is also on GitHub: **https://github.com/JUTTSABBB/EMI-Locker-APP** (branch `master`).
The fastest way to continue is to `git clone` that repo in the new session.

## What this product is
A legitimate device-financing "installment lock" platform for a shop in Pakistan:
- **Native Android app** (Device Owner) on the customer's phone — can't be uninstalled,
  survives factory reset, shows a full-screen lock when the EMI isn't paid.
- **Web dashboard (CRM)** for the company + shopkeepers.
- **Cloudflare Worker** backend (keeps us on Firebase's free Spark plan).
- The **server is the source of truth** for paid/unpaid, so neither a customer nor a
  shopkeeper can cheat.

## Repo layout
```
android/   Native Android app (Java, Android Studio-ready)
web/       Admin dashboard — Firebase Hosting static SPA (light theme, mobile-friendly)
worker/    Cloudflare Worker backend (lock decision, FCM, enroll, check-in)
docs/      SETUP.md (go-live runbook), this handoff
firebase.json, firestore.rules, .firebaserc   Firebase deploy config
.github/workflows/   CI: build APK, deploy Firebase, deploy Worker (all green)
```

## DONE and verified
- **Android app builds** to a debug APK in CI on every push (artifact `emi-locker-debug-apk`).
- **Device Owner protection**: blocks uninstall + factory reset + add-user + safe-boot
  (`android/.../admin/DevicePolicyController.java`).
- **Kiosk lock screen**: full-screen "DEVICE LOCKED" with amount due + support number,
  Lock Task mode, "I have paid / Refresh" button (`android/.../lock/`).
- **Boot receiver + periodic check-in** keep a locked phone locked and unlock a paid one.
- **Server check-in client** (HTTPS) + **offline-grace lock** (can't dodge by going offline).
- **Dashboard** (Overview finance KPIs, Devices, Staff) — professional, mobile-responsive,
  wired to Firebase Auth + Firestore with a demo-data fallback.
- **Worker backend**: device check-in, staff lock/unlock + FCM, enroll; per-device token
  (hash stored); staff endpoints require a verified Firebase ID token; CORS locked.
  Lock-decision logic **unit-tested (8/8)**.
- **Security**: no secret in the repo (service account only via GitHub/Worker secret).
- Live **preview** of the dashboard (demo data): see the chat for the claude.ai artifact link.

## NOT done yet (continue here)
1. **QR provisioning generation** — generate the Device Owner provisioning QR (package,
   signature checksum, APK download URL) so a factory-fresh phone auto-installs by scan.
   Needs: a release signing key, the APK hosted at a public HTTPS URL (can host under
   Firebase Hosting `web/downloads/`), and a small QR generator page/script.
2. **Multi-tenant model** — company (Ozzun super-admin) → shops → customers. Scope data by
   shop; shopkeepers can enroll/view but **cannot** lock/unlock (authority stays with Ozzun
   + automated payments). Update Firestore rules + dashboard roles accordingly.
3. **Payment gateway + auto-approve** — integrate a gateway so customer payments go to the
   company; a Worker webhook (`/api/payment/webhook`) marks the installment paid and
   auto-unlocks. Leave shopkeepers no manual lock authority.
4. **FCM on the app** — add `google-services.json` (gitignored) + firebase-messaging so
   lock/unlock is instant (not just on the periodic check-in).
5. **Go live** — follow `docs/SETUP.md`: create the Firebase project, paste the public
   `firebaseConfig` into `web/assets/firebase-config.js`, add 3 GitHub secrets
   (`FIREBASE_SERVICE_ACCOUNT`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), push.

## How to build / run
- APK (cloud): push to GitHub → Actions → `Build Android APK` → download the artifact.
- APK (local): `cd android && ./gradlew :app:assembleDebug` (needs Android SDK).
- Dashboard preview: open `web/index.html` locally, or deploy via the Firebase workflow.
- Worker tests: `cd worker && node --test`.

## Testing the Device Owner app (emulator)
Use an Android Studio AVD with a **non-Google-Play** system image, then:
`adb shell dpm set-device-owner com.ozzun.emilocker.debug/com.ozzun.emilocker.admin.EmiDeviceAdminReceiver`
OEM behaviour (OPPO/ColorOS, Vivo, Xiaomi/MIUI) still needs real target phones.
