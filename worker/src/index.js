/* Ozzun EMI Locker — Cloudflare Worker backend (free tier, keeps us off Firebase Blaze).
 *
 * Responsibilities:
 *   - Device check-in: the phone asks "am I locked?"; the SERVER decides (never the phone).
 *   - Staff commands: lock / unlock a device (verified Firebase staff only) + FCM push.
 *   - Enrollment: create an account + a per-device secret token.
 *
 * Security model:
 *   - The Firebase service account lives ONLY in the FIREBASE_SERVICE_ACCOUNT secret.
 *   - Devices authenticate with a per-device token; only its SHA-256 hash is stored.
 *   - Staff endpoints require a valid Firebase ID token AND an active staff record.
 *   - CORS is restricted to the dashboard origin.
 */
import { decideLock } from './lock.js';
import { parseServiceAccount, fsGet, fsPatch, fcmSend } from './google.js';
import { verifyIdToken, bearer } from './verify.js';

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...extra } });

function corsHeaders(env, request) {
  const origin = request.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'access-control-allow-origin': ok ? origin : (allowed[0] || ''),
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
  };
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function randomToken() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Require a valid, active staff user. Returns the staff doc or throws. */
async function requireStaff(request, env, sa) {
  const token = bearer(request);
  const u = await verifyIdToken(token, env.FIREBASE_API_KEY);
  const staff = await fsGet(sa, env.PROJECT_ID, `staff/${u.uid}`);
  if (!staff || staff.active !== true) throw new Error('not an active staff user');
  return { user: u, staff };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/health') return json({ ok: true, service: 'emi-locker-worker' }, 200, cors);
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

    let body = {};
    try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400, cors); }

    let sa;
    try { sa = parseServiceAccount(env); }
    catch (e) { return json({ error: 'server not configured' }, 500, cors); }

    try {
      // ---- Device check-in (phone) ----
      if (path === '/api/checkin') {
        const { deviceId, deviceToken } = body;
        if (!deviceId || !deviceToken) return json({ error: 'deviceId and deviceToken required' }, 400, cors);
        const device = await fsGet(sa, env.PROJECT_ID, `devices/${deviceId}`);
        if (!device) return json({ error: 'device not enrolled' }, 404, cors);
        if (device.tokenHash !== await sha256Hex(deviceToken)) return json({ error: 'bad device token' }, 401, cors);

        const account = await fsGet(sa, env.PROJECT_ID, `accounts/${deviceId}`);
        if (!account) return json({ error: 'account not found' }, 404, cors);

        const decision = decideLock(account, { graceDays: Number(env.GRACE_DAYS) || 3 });
        const nowIso = new Date().toISOString();
        await fsPatch(sa, env.PROJECT_ID, `devices/${deviceId}`, { lastCheckin: nowIso, lastServerContact: nowIso });

        return json({
          deviceId,
          locked: decision.locked,
          reason: decision.reason,
          amountDue: decision.amountDue,
          supportNumber: decision.supportNumber,
          graceUntil: decision.graceUntil,
          maxOfflineDays: Number(env.MAX_OFFLINE_DAYS) || 7,
        }, 200, cors);
      }

      // ---- Device registers its FCM token ----
      if (path === '/api/register-fcm') {
        const { deviceId, deviceToken, fcmToken } = body;
        if (!deviceId || !deviceToken || !fcmToken) return json({ error: 'deviceId, deviceToken, fcmToken required' }, 400, cors);
        const device = await fsGet(sa, env.PROJECT_ID, `devices/${deviceId}`);
        if (!device || device.tokenHash !== await sha256Hex(deviceToken)) return json({ error: 'unauthorized' }, 401, cors);
        await fsPatch(sa, env.PROJECT_ID, `devices/${deviceId}`, { fcmToken });
        return json({ ok: true }, 200, cors);
      }

      // ---- Staff enrolls a device ----
      if (path === '/api/enroll') {
        await requireStaff(request, env, sa);
        const { deviceId, customer, cnic, plan, monthly, months, supportNumber, paidUntil } = body;
        if (!deviceId || !customer || !cnic) return json({ error: 'deviceId, customer, cnic required' }, 400, cors);
        const existing = await fsGet(sa, env.PROJECT_ID, `accounts/${deviceId}`);
        if (existing) return json({ error: 'device already enrolled' }, 409, cors);

        const deviceToken = randomToken();
        await fsPatch(sa, env.PROJECT_ID, `accounts/${deviceId}`, {
          customer, cnic, plan: plan || '', monthly: Number(monthly) || 0, months: Number(months) || 0,
          supportNumber: supportNumber || '', paidUntil: paidUntil || '', state: 'active',
          createdAt: new Date().toISOString(),
        });
        await fsPatch(sa, env.PROJECT_ID, `devices/${deviceId}`, {
          tokenHash: await sha256Hex(deviceToken), fcmToken: '', createdAt: new Date().toISOString(),
        });
        // deviceToken is returned ONCE here; it is embedded into the device's app at provisioning.
        return json({ ok: true, deviceId, deviceToken }, 201, cors);
      }

      // ---- Staff lock / unlock ----
      if (path === '/api/command') {
        await requireStaff(request, env, sa);
        const { deviceId, action } = body;
        if (!deviceId || !['lock', 'unlock'].includes(action))
          return json({ error: 'deviceId and action (lock|unlock) required' }, 400, cors);

        const account = await fsGet(sa, env.PROJECT_ID, `accounts/${deviceId}`);
        if (!account) return json({ error: 'account not found' }, 404, cors);
        await fsPatch(sa, env.PROJECT_ID, `accounts/${deviceId}`, { state: action === 'lock' ? 'locked' : 'active' });

        const device = await fsGet(sa, env.PROJECT_ID, `devices/${deviceId}`);
        let pushed = false;
        if (device && device.fcmToken) {
          try { await fcmSend(sa, env.PROJECT_ID, device.fcmToken, { type: action, deviceId }); pushed = true; }
          catch (e) { /* phone will still pick it up on its next check-in */ }
        }
        return json({ ok: true, action, pushed }, 200, cors);
      }

      return json({ error: 'not found' }, 404, cors);
    } catch (e) {
      const msg = String(e && e.message || e);
      const authish = /staff|token|unauthorized/i.test(msg);
      return json({ error: authish ? 'unauthorized' : 'server error' }, authish ? 401 : 500, cors);
    }
  },
};
