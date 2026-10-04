import { Router } from 'express';
import { db } from '../db.js';
import { totalPlants, readyToDispatch, fleetSurvivalRate } from '../services/calcService.js';

const router = Router();

// GET /api/reports/summary — the KPI cards on the Reports page
router.get('/summary', async (req, res) => {
  await db.read();
  const batches = db.data.batches;
  const pricePerPlant = 30; // demo assumption; replace with real price list later

  res.json({
    totalPlants: totalPlants(batches),
    survivalRate: fleetSurvivalRate(batches),
    readyToDispatch: readyToDispatch(batches),
    estimatedInventoryValue: totalPlants(batches) * pricePerPlant,
  });
});

// GET /api/reports/trend — soil moisture history per zone, for charts
router.get('/trend', async (req, res) => {
  await db.read();
  const hours = Number(req.query.hours) || 24 * 7;
  const since = Date.now() - hours * 60 * 60 * 1000;
  const recent = db.data.readings.filter(r => r.ts >= since);

  const byZone = {};
  for (const r of recent) {
    byZone[r.zoneId] ||= [];
    byZone[r.zoneId].push({ ts: r.ts, soil: r.soil, temp: r.temp, humidity: r.humidity });
  }
  res.json(byZone);
});

export default router;
