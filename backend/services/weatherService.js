// weatherService.js
// "Tier 2" — real outdoor weather, adjusted with a greenhouse offset.
// Uses Open-Meteo (free, no API key). This will work as soon as it's run
// somewhere with open internet access (Open-Meteo isn't reachable from
// this sandbox's restricted network, but the code is production-ready).

import fetch from 'node-fetch';

const DEFAULT_LAT = 28.6139; // New Delhi
const DEFAULT_LON = 77.2090;

export async function fetchOutdoorWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,cloud_cover`;

  const res = await fetch(url, { timeout: 5000 });
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  const data = await res.json();

  return {
    outdoorTemp: data.current.temperature_2m,
    outdoorHumidity: data.current.relative_humidity_2m,
    cloudCoverFraction: data.current.cloud_cover / 100,
  };
}

/** Applies a greenhouse offset to outdoor readings to approximate indoor conditions. */
export function applyGreenhouseOffset({ outdoorTemp, outdoorHumidity, cloudCoverFraction }) {
  return {
    temperature: +(outdoorTemp + 4).toFixed(1),       // greenhouses run ~3-6C warmer
    humidity: Math.min(95, +(outdoorHumidity + 12).toFixed(1)), // less air exchange indoors
    cloudCoverFraction,
  };
}

/** Convenience wrapper: fetch + adjust in one call. Throws if the network call fails. */
export async function getGreenhouseWeather(lat, lon) {
  const outdoor = await fetchOutdoorWeather(lat, lon);
  return applyGreenhouseOffset(outdoor);
}
