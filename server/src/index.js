// EMI Locker backend — Step 1 (minimal but functional).
//
// Responsibilities already present:
//   - enroll a device (point-of-sale record)
//   - device check-in: the phone asks "am I locked?" and the SERVER decides
//   - shop actions: lock / unlock / mark-paid
//   - a plain dashboard to see and control devices
//
// Deliberately NOT here yet (added in later, tested steps):
//   - authentication on the dashboard
//   - field-level encryption of CNIC
//   - FCM push for instant lock/unlock
//   - Play Integrity verification
const path = require('path');
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- helper: compute the lock decision on the SERVER ---
// Truth lives here, never on the phone. A phone is locked if the shop locked it,
// or if its paid_until date has passed.
function decideLock(device) {
  if (device.lock_state === 'LOCKED') return true;
  if (device.paid_until && new Date(device.paid_until) < new Date()) return true;
  return false;
}

// ---------- Health ----------
app.get('/health', (req, res) => res.json({ ok: true, service: 'emi-locker', step: 1 }));

// ---------- Device check-in (called by the phone) ----------
// The app sends its device_id; the server returns the current lock decision plus a
// grace deadline the phone caches for the offline-lock policy (enforced in a later step).
app.post('/api/checkin', (req, res) => {
  const { device_id } = req.body || {};
  if (!device_id) return res.status(400).json({ error: 'device_id required' });

  const device = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(device_id);
  if (!device) return res.status(404).json({ error: 'device not enrolled' });

  db.prepare("UPDATE devices SET last_checkin = datetime('now') WHERE device_id = ?")
    .run(device_id);

  res.json({
    device_id,
    locked: decideLock(device),
    paid_until: device.paid_until,
    support_number: device.support_number,
  });
});

// ---------- Enroll a device (shop, at point of sale) ----------
app.post('/api/enroll', (req, res) => {
  const { device_id, customer_name, cnic, plan, support_number, paid_until } = req.body || {};
  if (!device_id || !customer_name || !cnic || !plan || !support_number) {
    return res.status(400).json({ error: 'device_id, customer_name, cnic, plan, support_number are required' });
  }
  try {
    db.prepare(`
      INSERT INTO devices (device_id, customer_name, cnic, plan, support_number, paid_until)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(device_id, customer_name, cnic, plan, support_number, paid_until || null);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'device_id already enrolled' });
    }
    res.status(500).json({ error: 'server error' });
  }
});

// ---------- List devices (dashboard) ----------
app.get('/api/devices', (req, res) => {
  const rows = db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
  const withDecision = rows.map(d => ({ ...d, effective_locked: decideLock(d) }));
  res.json(withDecision);
});

// ---------- Shop actions ----------
app.post('/api/devices/:device_id/lock', (req, res) => {
  const r = db.prepare("UPDATE devices SET lock_state = 'LOCKED' WHERE device_id = ?")
    .run(req.params.device_id);
  res.json({ ok: r.changes > 0 });
});

app.post('/api/devices/:device_id/unlock', (req, res) => {
  const r = db.prepare("UPDATE devices SET lock_state = 'UNLOCKED' WHERE device_id = ?")
    .run(req.params.device_id);
  res.json({ ok: r.changes > 0 });
});

app.post('/api/devices/:device_id/mark-paid', (req, res) => {
  const { paid_until } = req.body || {};
  if (!paid_until) return res.status(400).json({ error: 'paid_until (ISO date) required' });
  const r = db.prepare("UPDATE devices SET paid_until = ?, lock_state = 'UNLOCKED' WHERE device_id = ?")
    .run(paid_until, req.params.device_id);
  res.json({ ok: r.changes > 0 });
});

app.listen(PORT, () => {
  console.log(`EMI Locker server running on http://localhost:${PORT}`);
});
