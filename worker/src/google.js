/* Google auth + Firestore REST + FCM v1 helpers for Cloudflare Workers.
   Uses WebCrypto (available in Workers) to sign the service-account JWT.
   The service account private key is read from an env SECRET, never from code. */

function b64urlFromBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlFromString(str) {
  return b64urlFromBytes(new TextEncoder().encode(str));
}
function pemToArrayBuffer(pem) {
  const body = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/** Parse the service account JSON from the env secret. */
export function parseServiceAccount(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT secret is not set');
  return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
}

/** Mint a short-lived Google OAuth2 access token for the given scopes (cached per isolate). */
let _tokenCache = { token: null, exp: 0 };
export async function getAccessToken(sa, scope) {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache.token && _tokenCache.exp > now + 60) return _tokenCache.token;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64urlFromString(JSON.stringify(header))}.${b64urlFromString(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64urlFromBytes(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error('token exchange failed: ' + (await res.text()));
  const json = await res.json();
  _tokenCache = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  return json.access_token;
}

const FS_SCOPE = 'https://www.googleapis.com/auth/datastore';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

function fsBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

/** Convert a plain JS object to Firestore REST "fields" format (shallow, common types). */
function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) fields[k] = { nullValue: null };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else fields[k] = { stringValue: String(v) };
  }
  return fields;
}
/** Convert a Firestore REST document back to a plain object. */
export function fromFields(doc) {
  const out = {};
  const f = (doc && doc.fields) || {};
  for (const [k, v] of Object.entries(f)) {
    const t = Object.keys(v)[0];
    out[k] = t === 'integerValue' ? parseInt(v[t], 10)
           : t === 'doubleValue'  ? v[t]
           : t === 'booleanValue' ? v[t]
           : t === 'nullValue'    ? null
           : v[t];
  }
  return out;
}

export async function fsGet(sa, projectId, path) {
  const token = await getAccessToken(sa, FS_SCOPE);
  const res = await fetch(`${fsBase(projectId)}/${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('firestore get failed: ' + (await res.text()));
  return fromFields(await res.json());
}

export async function fsPatch(sa, projectId, path, obj) {
  const token = await getAccessToken(sa, FS_SCOPE);
  const mask = Object.keys(obj).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const res = await fetch(`${fsBase(projectId)}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: toFields(obj) }),
  });
  if (!res.ok) throw new Error('firestore patch failed: ' + (await res.text()));
  return fromFields(await res.json());
}

/** Send an FCM v1 data message to a device token. */
export async function fcmSend(sa, projectId, deviceFcmToken, data) {
  const token = await getAccessToken(sa, FCM_SCOPE);
  const strData = {};
  for (const [k, v] of Object.entries(data)) strData[k] = String(v);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ message: { token: deviceFcmToken, data: strData, android: { priority: 'high' } } }),
  });
  if (!res.ok) throw new Error('fcm send failed: ' + (await res.text()));
  return res.json();
}
