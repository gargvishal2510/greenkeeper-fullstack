import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/zones — all zones with latest live readings
router.get('/', async (req, res) => {
  await db.read();
  res.json(db.data.zones);
});

// GET /api/zones/:id — single zone
router.get('/:id', async (req, res) => {
  await db.read();
  const zone = db.data.zones.find(z => z.id === req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json(zone);
});

// GET /api/zones/:id/history?hours=24 — reading history for charts
router.get('/:id/history', async (req, res) => {
  await db.read();
  const hours = Number(req.query.hours) || 24;
  const since = Date.now() - hours * 60 * 60 * 1000;
  const history = db.data.readings.filter(r => r.zoneId === req.params.id && r.ts >= since);
  res.json(history);
});

export default router;
