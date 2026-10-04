import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/irrigation — pump state per zone
router.get('/', async (req, res) => {
  await db.read();
  res.json(db.data.zones.map(z => ({ zone: z.id, name: z.name, pumpOn: z.pumpOn, soil: z.soil })));
});

// POST /api/irrigation/:zoneId/toggle  { on: true|false }
// This is what the dashboard's toggle switch should call for real.
// The change is picked up by the ESP32 on its next check-in (see sensor.js).
router.post('/:zoneId/toggle', async (req, res) => {
  await db.read();
  const zone = db.data.zones.find(z => z.id === req.params.zoneId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  zone.pumpOn = req.body.on != null ? !!req.body.on : !zone.pumpOn;
  await db.write();

  const io = req.app.get('io');
  if (io) io.emit('zones-update', db.data.zones);

  res.json({ zone: zone.id, pumpOn: zone.pumpOn });
});

// GET /api/irrigation/schedule
router.get('/schedule', async (req, res) => {
  await db.read();
  res.json(db.data.irrigationSchedule);
});

export default router;
