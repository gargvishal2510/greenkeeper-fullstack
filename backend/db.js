// db.js
// Lightweight JSON-file database (via lowdb) so the backend runs immediately
// with zero external services. The data-access shape below intentionally
// mirrors what Mongoose + MongoDB collections would look like, so swapping
// to real MongoDB later only means changing this file — routes don't change.
// See /models-mongoose for the equivalent Mongoose schemas to swap in.

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, 'data', 'db.json');

const defaultData = {
  zones: [
    { id: 'A', name: 'Zone A — Seedling House', crop: 'Tomato & Chilli',
      temp: 26, humidity: 64, soil: 58, light: 72, status: 'ok',
      pumpOn: false, moistureThreshold: 30 },
    { id: 'B', name: 'Zone B — Sapling Yard', crop: 'Mango & Guava',
      temp: 29, humidity: 48, soil: 31, light: 81, status: 'warn',
      pumpOn: false, moistureThreshold: 30 },
    { id: 'C', name: 'Zone C — Flowering Bay', crop: 'Marigold & Rose',
      temp: 34, humidity: 41, soil: 22, light: 88, status: 'crit',
      pumpOn: true, moistureThreshold: 30 },
    { id: 'D', name: 'Zone D — Herb Bench', crop: 'Basil & Mint',
      temp: 25, humidity: 70, soil: 66, light: 55, status: 'ok',
      pumpOn: false, moistureThreshold: 30 },
  ],

  readings: [], // history log: { zoneId, temp, humidity, soil, light, ts }

  batches: [
    { id: 'BT-1042', species: 'Tomato Seedling', zone: 'A', stage: 'seed', qty: 420, initialQty: 460, health: 92, planted: '2026-07-28' },
    { id: 'BT-1038', species: 'Rose Cutting', zone: 'C', stage: 'mature', qty: 96, initialQty: 120, health: 74, planted: '2026-05-12' },
    { id: 'BT-1051', species: 'Basil', zone: 'D', stage: 'seed', qty: 310, initialQty: 320, health: 88, planted: '2026-08-02' },
    { id: 'BT-1029', species: 'Mango Sapling', zone: 'B', stage: 'sapling', qty: 64, initialQty: 90, health: 65, planted: '2026-03-20' },
    { id: 'BT-1046', species: 'Marigold', zone: 'C', stage: 'mature', qty: 220, initialQty: 260, health: 80, planted: '2026-06-15' },
    { id: 'BT-1033', species: 'Aloe Vera', zone: 'D', stage: 'sapling', qty: 150, initialQty: 155, health: 95, planted: '2026-04-30' },
    { id: 'BT-1055', species: 'Guava Sapling', zone: 'B', stage: 'sapling', qty: 58, initialQty: 85, health: 59, planted: '2026-02-18' },
    { id: 'BT-1060', species: 'Chilli Seedling', zone: 'A', stage: 'seed', qty: 280, initialQty: 300, health: 90, planted: '2026-08-05' },
  ],

  alerts: [
    { id: 1, level: 'crit', title: 'Zone C soil moisture critically low (22%)', zone: 'C', ts: Date.now() - 6 * 60 * 1000, acknowledged: false },
    { id: 2, level: 'crit', title: 'Zone C temperature above safe range (34°C)', zone: 'C', ts: Date.now() - 6 * 60 * 1000, acknowledged: false },
    { id: 3, level: 'warn', title: 'Zone B humidity trending down (48%)', zone: 'B', ts: Date.now() - 24 * 60 * 1000, acknowledged: false },
  ],

  irrigationSchedule: [
    { zone: 'A', start: '06:30 AM', duration: '12 min', frequency: 'Twice daily' },
    { zone: 'B', start: '06:30 AM', duration: '12 min', frequency: 'Twice daily' },
    { zone: 'C', start: '06:30 AM', duration: '12 min', frequency: 'Twice daily' },
    { zone: 'D', start: '06:30 AM', duration: '12 min', frequency: 'Twice daily' },
  ],

  // Tasks are shared by the admin assignment screen and the staff checklist.
  tasks: [
    { id: 1, title: 'Water Zone A seedling trays', zone: 'A', assignee: 'Aman Verma', dueDate: '2026-10-04', completed: false },
    { id: 2, title: 'Check soil pH in Zone D herb bench', zone: 'D', assignee: 'Aman Verma', dueDate: '2026-10-04', completed: false },
    { id: 3, title: 'Move mature marigold trays to dispatch shelf', zone: 'C', assignee: 'Aman Verma', dueDate: '2026-10-05', completed: true },
    { id: 4, title: 'Refill nutrient tank for drip line 2', zone: 'A', assignee: 'Aman Verma', dueDate: '2026-10-05', completed: false },
  ],

  meta: { nextAlertId: 4, nextTaskId: 5 },
};

const adapter = new JSONFile(file);
export const db = new Low(adapter, defaultData);

export async function initDb() {
  await db.read();
  db.data ||= defaultData;
  // Add new collections when an existing local database is opened after an update.
  db.data.tasks ||= defaultData.tasks;
  db.data.meta ||= {};
  db.data.meta.nextTaskId ||= Math.max(0, ...db.data.tasks.map(task => Number(task.id) || 0)) + 1;
  await db.write();
}
