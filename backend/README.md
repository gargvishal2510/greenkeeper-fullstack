# Greenkeeper — Full Stack (Frontend + Backend)

A working full-stack version of the Smart Nursery Management System.
The Express backend serves the dashboard directly, so **one command runs
the whole thing** — no external services, no MongoDB install, no API keys.

## 1. Run it

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:4000** in your browser. That's the entire
dashboard — login screen, admin view, staff view — now pulling live data
from the backend instead of hardcoded sample arrays.

You'll see a green **"● Live"** indicator next to the clock once the page
successfully connects to the backend. If you open `public/index.html`
directly as a file (backend not running), it silently falls back to the
built-in sample data so it still works as an offline demo.

Zone readings update automatically every 15 seconds via the built-in
simulator (see "How the data is generated" below) — no hardware needed to
see it working end-to-end. Toggle a pump switch in the Irrigation tab and
watch it actually persist on the backend (refresh the page to confirm).

## 2. Endpoint reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Server status |
| GET | `/api/zones` | All zones with live readings |
| GET | `/api/zones/:id` | One zone |
| GET | `/api/zones/:id/history?hours=24` | Reading history for charts |
| POST | `/api/sensor-data` | Ingest a reading (used by real ESP32 firmware *or* the simulator) |
| GET | `/api/batches?search=&stage=&zone=` | Plant batch inventory, filterable |
| POST | `/api/batches` | Add a batch |
| PATCH | `/api/batches/:id` | Update a batch |
| DELETE | `/api/batches/:id` | Remove a batch |
| GET | `/api/irrigation` | Pump state per zone |
| POST | `/api/irrigation/:zoneId/toggle` | Turn a zone's pump on/off |
| GET | `/api/irrigation/schedule` | Watering schedule |
| GET | `/api/alerts?unacknowledged=true` | Alert log |
| POST | `/api/alerts/:id/ack` | Acknowledge an alert |
| GET | `/api/reports/summary` | KPI cards (total plants, survival rate, etc.) |
| GET | `/api/reports/trend?hours=168` | Historical readings per zone, for charts |

It also emits **Socket.IO** events so a connected dashboard updates live
without polling:
- `zones-update` — fired whenever any zone's readings change
- `alert-new` — fired when a new alert is raised

## 3. How the data is generated (no hardware required)

Controlled by the `DATA_MODE` env var (see `.env.example`):

- **`calc` (default)** — Pure formulas, no internet needed. Soil moisture
  uses a simplified water-balance step function; light uses a solar-elevation
  estimate; survival/growth rate come from your own batch records. This is
  what runs out of the box.
- **`weather`** — Calls the free Open-Meteo API for real outdoor
  temperature/humidity/cloud cover, then applies a greenhouse offset
  (`services/weatherService.js`). Falls back to `calc` automatically if the
  network call fails.

Either way, `POST /api/sensor-data` is ready for a **real ESP32** to call
directly the moment you have hardware — the simulator and a physical sensor
hit the exact same endpoint, so nothing else in the system needs to change.

## 4. What's already wired up

`public/index.html` is the same dashboard from before, now connected:

- On load, it calls `/api/health` — if the backend responds, it replaces
  the sample `zones`/`batches`/`alertsData` arrays with live data from
  `/api/zones`, `/api/batches`, `/api/alerts`, `/api/irrigation/schedule`.
- It opens a Socket.IO connection and re-renders gauges/zone cards/alerts
  automatically on `zones-update` and `alert-new` events — no polling.
- Irrigation toggle switches call `POST /api/irrigation/:zone/toggle`.
- Alert "Acknowledge" buttons call `POST /api/alerts/:id/ack`.
- Reports KPI cards are populated from `/api/reports/summary`.
- If the fetches fail (backend not running, or opened as a bare file),
  it quietly keeps the original hardcoded sample data — so the file still
  works as a standalone offline demo either way.

The staff dashboard's task checklist and activity log are still client-side
only, since the backend doesn't yet have a tasks/staff-activity resource —
that's a natural next endpoint to add if you extend this further.

## 5. Project structure

```
backend/
├── server.js              # Express + Socket.IO entrypoint
├── db.js                  # lowdb setup + seed data
├── routes/                # one file per resource
│   ├── zones.js
│   ├── sensor.js           # <-- real ESP32 devices POST here
│   ├── batches.js
│   ├── irrigation.js
│   ├── alerts.js
│   └── reports.js
├── services/
│   ├── calcService.js      # Tier 3: formulas, no data source needed
│   ├── weatherService.js   # Tier 2: Open-Meteo + greenhouse offset
│   └── simulator.js        # ties it together on a timer
├── models-mongoose/        # reference schemas for migrating to real MongoDB later
└── data/db.json            # the "database" (auto-created on first run)
```

## 6. Moving to real MongoDB later

See `models-mongoose/README.md` — the route files only ever touch
`db.data.<collection>`, so swapping the storage layer for Mongoose models
doesn't require changing any route logic.
