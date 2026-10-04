import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/alerts?unacknowledged=true
router.get('/', async (req, res) => {
  await db.read();
  let list = [...db.data.alerts].sort((a, b) => b.ts - a.ts);
  if (req.query.unacknowledged === 'true') list = list.filter(a => !a.acknowledged);
  res.json(list);
});

// POST /api/alerts/:id/ack
router.post('/:id/ack', async (req, res) => {
  await db.read();
  const alert = db.data.alerts.find(a => a.id === Number(req.params.id));
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.acknowledged = true;
  await db.write();
  res.json(alert);
});

export default router;
