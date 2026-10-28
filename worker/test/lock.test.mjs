import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideLock, offlineShouldLock, DAY } from '../src/lock.js';

const NOW = new Date('2026-10-28T00:00:00Z').getTime();

test('active + paid in future -> unlocked', () => {
  const r = decideLock({ state: 'active', paidUntil: '2026-11-27', monthly: 2800, supportNumber: '+92' }, { now: NOW });
  assert.equal(r.locked, false);
  assert.equal(r.amountDue, 0);
});

test('manual shop lock -> locked, shows amount + support', () => {
  const r = decideLock({ state: 'locked', paidUntil: '2026-12-15', monthly: 4100, supportNumber: '+92300' }, { now: NOW });
  assert.equal(r.locked, true);
  assert.equal(r.reason, 'manual_lock');
  assert.equal(r.amountDue, 4100);
  assert.equal(r.supportNumber, '+92300');
});

test('overdue beyond grace -> locked', () => {
  const r = decideLock({ state: 'active', paidUntil: '2026-10-10', monthly: 5600, supportNumber: '' }, { now: NOW, graceDays: 3 });
  assert.equal(r.locked, true);
  assert.equal(r.reason, 'overdue');
});

test('overdue but still inside grace window -> unlocked', () => {
  const r = decideLock({ state: 'active', paidUntil: '2026-10-26', monthly: 5600 }, { now: NOW, graceDays: 3 });
  assert.equal(r.locked, false);
  assert.equal(r.reason, 'current');
});

test('completed plan -> never locked', () => {
  const r = decideLock({ state: 'done', paidUntil: '2025-12-12', monthly: 3600 }, { now: NOW });
  assert.equal(r.locked, false);
});

test('offline grace: within window -> no self-lock', () => {
  const cached = { lastServerContact: new Date(NOW - 2 * DAY).toISOString() };
  assert.equal(offlineShouldLock(cached, { now: NOW, maxOfflineDays: 7 }), false);
});

test('offline grace: past window -> self-lock', () => {
  const cached = { lastServerContact: new Date(NOW - 9 * DAY).toISOString() };
  assert.equal(offlineShouldLock(cached, { now: NOW, maxOfflineDays: 7 }), true);
});

test('offline grace: never contacted -> do not brick fresh device', () => {
  assert.equal(offlineShouldLock(null, { now: NOW }), false);
});
