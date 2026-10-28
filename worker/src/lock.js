/* Pure lock-decision logic — the single source of truth for "is this phone locked?".
   No I/O here so it is fully unit-testable. The phone NEVER decides this itself;
   it only asks the Worker, and the Worker runs this against server-held data. */

export const DAY = 24 * 60 * 60 * 1000;

/**
 * Decide whether a device must be locked.
 * @param {object} account  Firestore account: { state, paidUntil, monthly, supportNumber }
 * @param {object} opts      { now?: number, graceDays?: number }
 * @returns {{locked:boolean, reason:string, amountDue:number, supportNumber:string, graceUntil:string|null}}
 */
export function decideLock(account, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date();
  const graceDays = Number.isFinite(opts.graceDays) ? opts.graceDays : 3;

  const supportNumber = account.supportNumber || '';
  const monthly = Number(account.monthly) || 0;

  // 1) Explicit shop lock always wins.
  if (account.state === 'locked') {
    return { locked: true, reason: 'manual_lock', amountDue: monthly, supportNumber, graceUntil: null };
  }
  // 2) Completed plan is free forever.
  if (account.state === 'done') {
    return { locked: false, reason: 'completed', amountDue: 0, supportNumber, graceUntil: null };
  }
  // 3) Payment overdue beyond the grace window.
  if (account.paidUntil) {
    const due = new Date(account.paidUntil);
    const graceUntil = new Date(due.getTime() + graceDays * DAY);
    if (now > graceUntil) {
      return { locked: true, reason: 'overdue', amountDue: monthly, supportNumber, graceUntil: graceUntil.toISOString() };
    }
    return { locked: false, reason: 'current', amountDue: 0, supportNumber, graceUntil: graceUntil.toISOString() };
  }
  // 4) No due date on record -> treat as active.
  return { locked: false, reason: 'active', amountDue: 0, supportNumber, graceUntil: null };
}

/**
 * Offline grace policy for the device side: the phone caches `graceUntil` and the
 * last server-confirmed status. If it cannot reach the server past this deadline it
 * locks itself, so disabling the internet does not dodge a lock.
 */
export function offlineShouldLock(cached, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date();
  const maxOfflineDays = Number.isFinite(opts.maxOfflineDays) ? opts.maxOfflineDays : 7;
  if (!cached || !cached.lastServerContact) return false; // never contacted yet -> don't brick a fresh device
  const deadline = new Date(new Date(cached.lastServerContact).getTime() + maxOfflineDays * DAY);
  return now > deadline;
}
