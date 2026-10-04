import { Router } from 'express';
import { db } from '../db.js';
import { statusFromReadings } from '../services/calcService.js';

const router = Router();

// POST /api/sensor-data
// This is the endpoint a real ESP32 (see the firmware discussed earlier)
// would call. It works identically whether the caller is a real device or
// the built-in simulator — the backend doesn't know or care which.
router.post('/', async (req, res) => {
  const { zone: zoneId, soilMoisture, temperature, humidity, light } = req.body;

  if (!zoneId || soilMoisture == null || temperature == null) {
    return res.status(400).json({ error: 'zone, soilMoisture, and temperature are required' });
  }

  await db.read();
  const zone = db.data.zones.find(z => z.id === zoneId);
  if (!zone) return res.status(404).json({ error: `Unknown zone "${zoneId}"` });

  zone.temp = temperature;
  zone.humidity = humidity ?? zone.humidity;
  zone.soil = soilMoisture;
  if (light != null) zone.light = light;
  zone.status = statusFromReadings({ soil: zone.soil, temp: zone.temp, moistureThreshold: zone.moistureThreshold });

  db.data.readings.push({ zoneId: zone.id, temp: zone.temp, humidity: zone.humidity, soil: zone.soil, light: zone.light, ts: Date.now() });
  await db.write();

  const io = req.app.get('io');
  if (io) io.emit('zones-update', db.data.zones);

  // Tell the device whether to run the pump right now (local override wins on-device too)
  const shouldPump = zone.soil < zone.moistureThreshold;
  res.json({ pump: shouldPump, receivedAt: new Date().toISOString() });
});

export default router;
