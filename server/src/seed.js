// Inserts one sample device so you can see the dashboard working immediately.
// Run:  npm run seed
const db = require('./db');

const sample = {
  device_id: 'DEMO-DEVICE-001',
  customer_name: 'Ali Raza',
  cnic: '35202-1234567-1',
  plan: '12 months x PKR 5,000',
  support_number: '+92 300 0000000',
  paid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
};

db.prepare(`
  INSERT OR REPLACE INTO devices (device_id, customer_name, cnic, plan, support_number, paid_until)
  VALUES (@device_id, @customer_name, @cnic, @plan, @support_number, @paid_until)
`).run(sample);

console.log('Seeded sample device:', sample.device_id);
