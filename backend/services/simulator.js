// simulator.js
// Runs on an interval and updates every zone's "live" readings.
// DATA_MODE=weather -> tries the real Open-Meteo API (Tier 2) with a
//   per-zone random offset so zones don't all read identically.
// DATA_MODE=calc (default) -> pure local calculation (Tier 3), no network
//   needed at all, which is what actually runs inside this sandbox.
// Either way, soil moisture always uses the water-balance step function,
// and alerts/status are derived the same way regardless of data source.

import { db } from '../db.js';
import { stepSoilMoisture, estimateLight, statusFromReadings } from './calcService.js';
import { getGreenhouseWeather } from './weatherService.js';

const DATA_MODE = process.env.DATA_MODE || 'calc';
let cachedWeather = null;
let lastWeatherFetch = 0;

async function getBaseWeather() {
  if (DATA_MODE !== 'weather') return null;
  const now = Date.now();
  if (cachedWeather && now - lastWeatherFetch < 10 * 60 * 1000) return cachedWeather;
  try {
    cachedWeather = await getGreenhouseWeather();
    lastWeatherFetch = now;
  } catch (err) {
    console.warn('[simulator] weather API unavailable, falling back to calc mode:', err.message);
    cachedWeather = null;
  }
  return cachedWeather;
}

function jitter(base, spread) {
  return base + (Math.random() * 2 - 1) * spread;
}

export async function tick(io) {
  await db.read();
  const weather = await getBaseWeather();
  const newAlerts = [];

  for (const zone of db.data.zones) {
    let temp, humidity, cloudCoverFraction;

    if (weather) {
      temp = +jitter(weather.temperature, 1.5).toFixed(1);
      humidity = Math.min(95, Math.max(20, +jitter(weather.humidity, 4).toFixed(1)));
      cloudCoverFraction = weather.cloudCoverFraction;
    } else {
      // Tier 3 fallback: gentle random walk around the current value
      temp = +Math.min(40, Math.max(15, jitter(zone.temp, 0.8))).toFixed(1);
      humidity = +Math.min(95, Math.max(20, jitter(zone.humidity, 2.5))).toFixed(1);
      cloudCoverFraction = 0.25;
    }

    const soil = stepSoilMoisture({ soil: zone.soil, temp, humidity, pumpOn: zone.pumpOn });
    const light = estimateLight({ cloudCoverFraction });
    const status = statusFromReadings({ soil, temp, moistureThreshold: zone.moistureThreshold });

    // auto-pump: local fail-safe rule, mirrors the ESP32 firmware logic
    if (soil < zone.moistureThreshold && !zone.pumpOn) {
      zone.pumpOn = true;
    } else if (soil > zone.moistureThreshold + 20 && zone.pumpOn) {
      zone.pumpOn = false;
    }

    const prevStatus = zone.status;
    Object.assign(zone, { temp, humidity, soil, light, status });

    db.data.readings.push({ zoneId: zone.id, temp, humidity, soil, light, ts: Date.now() });

    if (status !== 'ok' && status !== prevStatus) {
      const alert = {
        id: db.data.meta.nextAlertId++,
        level: status,
        title: soil < zone.moistureThreshold
          ? `${zone.name} soil moisture ${status === 'crit' ? 'critically ' : ''}low (${soil}%)`
          : `${zone.name} temperature above safe range (${temp}°C)`,
        zone: zone.id,
        ts: Date.now(),
        acknowledged: false,
      };
      db.data.alerts.unshift(alert);
      newAlerts.push(alert);
    }
  }

  // cap history so the JSON file doesn't grow unbounded in this demo
  if (db.data.readings.length > 2000) {
    db.data.readings = db.data.readings.slice(-2000);
  }

  await db.write();

  if (io) {
    io.emit('zones-update', db.data.zones);
    newAlerts.forEach(a => io.emit('alert-new', a));
  }
}

export function startSimulator(io, intervalMs = 15000) {
  console.log(`[simulator] running in "${DATA_MODE}" mode, every ${intervalMs / 1000}s`);
  tick(io); // run once immediately
  return setInterval(() => tick(io), intervalMs);
}
