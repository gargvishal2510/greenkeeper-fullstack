import { Router } from 'express';
import { db } from '../db.js';
import { survivalRate, daysSincePlanting } from '../services/calcService.js';

const router = Router();
const editableFields = ['species', 'zone', 'stage', 'qty', 'health', 'planted'];

function normalizeBatchFields(body) {
  const batch = {};
  for (const field of editableFields) {
    if (body[field] === undefined) continue;
    if (field === 'qty' || field === 'health') batch[field] = Number(body[field]);
    else batch[field] = String(body[field]).trim();
  }
  return batch;
}

function validBatch(batch) {
  return batch.species && batch.zone && batch.stage && Number.isFinite(batch.qty) && batch.qty > 0 && Number.isFinite(batch.health) && batch.health >= 0 && batch.health <= 100;
}

// GET /api/batches?search=&stage=&zone=
router.get('/', async (req, res) => {
  await db.read();
  let list = [...db.data.batches];
  const { search, stage, zone } = req.query;

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(b => b.species.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
  }
  if (stage) list = list.filter(b => b.stage === stage);
  if (zone) list = list.filter(b => b.zone === zone);

  const enriched = list.map(b => ({
    ...b,
    survivalRate: survivalRate(b),
    daysInNursery: daysSincePlanting(b.planted),
  }));

  res.json(enriched);
});

// POST /api/batches — add a new batch
router.post('/', async (req, res) => {
  const id = String(req.body.id || '').trim();
  const payload = normalizeBatchFields(req.body);
  if (!id || !validBatch({ ...payload, stage: payload.stage || 'seed', health: payload.health ?? 100 })) {
    return res.status(400).json({ error: 'id, species, zone, and qty are required' });
  }
  await db.read();
  if (db.data.batches.some(b => b.id === id)) {
    return res.status(409).json({ error: `Batch ${id} already exists` });
  }
  const batch = { id, ...payload, stage: payload.stage || 'seed', health: payload.health ?? 100, planted: payload.planted || new Date().toISOString().slice(0, 10), initialQty: payload.qty };
  db.data.batches.push(batch);
  await db.write();
  res.status(201).json(batch);
});

// PATCH /api/batches/:id — update quantity/stage/health
router.patch('/:id', async (req, res) => {
  await db.read();
  const batch = db.data.batches.find(b => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  const payload = normalizeBatchFields(req.body);
  const updated = { ...batch, ...payload };
  if (!validBatch(updated)) {
    return res.status(400).json({ error: 'species, zone, stage, qty, and health must be valid' });
  }
  Object.assign(batch, payload);
  await db.write();
  res.json(batch);
});

// DELETE /api/batches/:id
router.delete('/:id', async (req, res) => {
  await db.read();
  const before = db.data.batches.length;
  db.data.batches = db.data.batches.filter(b => b.id !== req.params.id);
  if (db.data.batches.length === before) return res.status(404).json({ error: 'Batch not found' });
  await db.write();
  res.status(204).end();
});

export default router;
