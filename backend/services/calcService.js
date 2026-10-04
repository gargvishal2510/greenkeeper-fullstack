// calcService.js
// "Tier 3" — pure calculations that need no sensor and no external API.

/** survivalRate = (currentAliveCount / initialPlantedCount) x 100 */
export function survivalRate(batch) {
  if (!batch.initialQty) return null;
  return +((batch.qty / batch.initialQty) * 100).toFixed(1);
}

/** growthRate: a simple days-in-nursery based proxy (%/day toward maturity) */
export function daysSincePlanting(plantedDateStr) {
  const planted = new Date(plantedDateStr).getTime();
  const now = Date.now();
  return Math.max(1, Math.round((now - planted) / (1000 * 60 * 60 * 24)));
}

export function fleetSurvivalRate(batches) {
  const totalInitial = batches.reduce((a, b) => a + (b.initialQty || b.qty), 0);
  const totalNow = batches.reduce((a, b) => a + b.qty, 0);
  if (!totalInitial) return 0;
  return +((totalNow / totalInitial) * 100).toFixed(1);
}

export function totalPlants(batches) {
  return batches.reduce((a, b) => a + b.qty, 0);
}

export function readyToDispatch(batches) {
  return batches.filter(b => b.stage === 'mature').reduce((a, b) => a + b.qty, 0);
}

/**
 * Soil water balance model (simplified FAO Penman-Monteith style):
 *   soilMoisture(t) = soilMoisture(t-1) + irrigation - ET
 * ET (evapotranspiration, % lost per tick) grows with heat and dryness,
 * and shrinks with humidity. This lets soil moisture "drift" realistically
 * without ever reading a physical sensor.
 */
export function stepSoilMoisture({ soil, temp, humidity, pumpOn }) {
  const et = Math.max(0, (temp - 20) * 0.15) * (1 - humidity / 100) * 0.6; // % lost this tick
  let next = soil - et;
  if (pumpOn) next += 6; // irrigation adds moisture while pump is on
  return Math.min(100, Math.max(0, +next.toFixed(1)));
}

/**
 * Solar elevation based light estimate (0-100), using latitude + time of day.
 * Falls back to a simple day/night curve if no lat/lon is supplied.
 */
export function estimateLight({ lat = 28.6, lon = 77.2, cloudCoverFraction = 0.2, date = new Date() } = {}) {
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const declination = -23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * rad);
  const hourDecimal = date.getHours() + date.getMinutes() / 60;
  const hourAngle = (hourDecimal - 12) * 15;

  const elevation = Math.asin(
    Math.sin(lat * rad) * Math.sin(declination * rad) +
    Math.cos(lat * rad) * Math.cos(declination * rad) * Math.cos(hourAngle * rad)
  ) / rad;

  const raw = Math.max(0, Math.sin(elevation * rad)) * 100;
  return +(raw * (1 - cloudCoverFraction)).toFixed(1);
}

export function statusFromReadings({ soil, temp, moistureThreshold = 30 }) {
  if (soil < moistureThreshold - 5 || temp > 33) return 'crit';
  if (soil < moistureThreshold || temp > 30) return 'warn';
  return 'ok';
}
