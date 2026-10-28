/* Verify a Firebase ID token sent by the dashboard (staff).
   We validate it server-side via Google Identity Toolkit (accounts:lookup) instead of
   hand-rolling JWT crypto — Google tells us if it is genuine and returns the user.
   The API key is the PUBLIC Firebase web key (fine as a Worker var, not a secret). */

export async function verifyIdToken(idToken, apiKey) {
  if (!idToken) throw new Error('missing id token');
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) throw new Error('id token rejected');
  const json = await res.json();
  const user = json.users && json.users[0];
  if (!user) throw new Error('no user for token');
  return { uid: user.localId, email: user.email, emailVerified: !!user.emailVerified };
}

/** Pull "Authorization: Bearer <token>" from a request. */
export function bearer(request) {
  const h = request.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
