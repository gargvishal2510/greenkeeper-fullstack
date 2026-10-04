# Migrating from lowdb to real MongoDB

The running backend uses `lowdb` (a JSON file) so it works immediately with
zero setup. The route files (`routes/*.js`) only ever call `db.read()`,
`db.write()`, and read/write `db.data.<collection>` — they never touch the
file format directly. That means switching to real MongoDB later is a
**data-access swap, not a rewrite**.

## Steps to migrate later

1. `npm install mongoose`
2. Create `db.js` equivalent that connects with `mongoose.connect(process.env.MONGO_URI)`
3. Replace `db.data.zones` style array operations in each route with the
   equivalent Mongoose model calls (`Zone.find()`, `Zone.findByIdAndUpdate()`, etc.)
   using the schemas below.
4. Everything else — Express routes, Socket.IO, the calculation/weather
   services — stays exactly the same.

## Equivalent schemas

```javascript
import mongoose from 'mongoose';

const ZoneSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  crop: String,
  temp: Number,
  humidity: Number,
  soil: Number,
  light: Number,
  status: { type: String, enum: ['ok', 'warn', 'crit'] },
  pumpOn: { type: Boolean, default: false },
  moistureThreshold: { type: Number, default: 30 },
});

const ReadingSchema = new mongoose.Schema({
  zoneId: { type: String, index: true },
  temp: Number,
  humidity: Number,
  soil: Number,
  light: Number,
  ts: { type: Date, default: Date.now },
});

const BatchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  species: String,
  zone: String,
  stage: { type: String, enum: ['seed', 'sapling', 'mature'] },
  qty: Number,
  initialQty: Number,
  health: Number,
  planted: Date,
});

const AlertSchema = new mongoose.Schema({
  level: { type: String, enum: ['ok', 'warn', 'crit'] },
  title: String,
  zone: String,
  acknowledged: { type: Boolean, default: false },
  ts: { type: Date, default: Date.now },
});

export const Zone = mongoose.model('Zone', ZoneSchema);
export const Reading = mongoose.model('Reading', ReadingSchema);
export const Batch = mongoose.model('Batch', BatchSchema);
export const Alert = mongoose.model('Alert', AlertSchema);
```

This is worth mentioning in your synopsis/viva: the data layer is already
structured the same way MongoDB collections would be, so the "MERN" claim
holds even though the running prototype uses a lightweight file store for
convenience during development.
