# Greenkeeper

Greenkeeper is a full-stack smart nursery management dashboard. It gives nursery administrators a live view of growing zones, irrigation, inventory, alerts, reports, and staff work assignments from one application.

The frontend is served directly by the Express backend, and the project includes a local JSON database plus a built-in sensor simulator. It runs without MongoDB, hardware, or API keys.

## Features

- Live zone readings for temperature, humidity, soil moisture, and light
- Automatic sensor simulation with optional real-weather mode
- Irrigation controls and watering schedules
- Plant-batch inventory with add and edit workflows
- Alert feed with acknowledgement support
- Dashboard KPIs and trend reports
- Admin task assignment and editing
- Staff **My Tasks** checklist with persistent completion status
- Socket.IO updates for changing zone readings and alerts

## Tech stack

- Node.js and Express
- Socket.IO
- LowDB JSON-file database
- Vanilla HTML, CSS, and JavaScript
- Chart.js

## Run locally

```bash
git clone https://github.com/gargvishal2510/greenkeeper-fullstack.git
cd greenkeeper-fullstack/backend
npm install
npm start
```

Open [http://localhost:4000](http://localhost:4000).

Use the prototype login to enter either role:

- **Admin**: manage batches, irrigation, alerts, reports, and staff assignments.
- **Staff**: view assigned work in **My Tasks** and mark tasks complete.

## Configuration

The application works with its defaults. To customise it, copy `backend/.env.example` to `backend/.env`.

| Variable | Default | Purpose |
|---|---:|---|
| `PORT` | `4000` | Web server port |
| `DATA_MODE` | `calc` | `calc` uses local formulas; `weather` uses Open-Meteo when available |
| `SIM_INTERVAL_MS` | `15000` | Sensor-simulator refresh interval in milliseconds |

## Project structure

```text
backend/
├── public/index.html       # Dashboard frontend
├── routes/                 # REST API resources
│   ├── batches.js          # Plant batch add/edit API
│   ├── tasks.js            # Staff task assignment/completion API
│   ├── zones.js            # Zone data and history
│   ├── irrigation.js       # Pump controls and schedules
│   ├── alerts.js           # Alert feed
│   └── reports.js          # Dashboard metrics
├── services/               # Simulator and calculation services
├── data/db.json            # Local database, created/updated at runtime
├── db.js                   # LowDB setup and seed data
└── server.js               # Express and Socket.IO entry point
```

## API overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and data mode |
| `GET`, `POST` | `/api/batches` | List or add plant batches |
| `PATCH` | `/api/batches/:id` | Update a plant batch |
| `GET`, `POST` | `/api/tasks` | List or create staff tasks |
| `PATCH` | `/api/tasks/:id` | Edit a task or update its completion status |
| `GET` | `/api/zones` | Current zone readings |
| `POST` | `/api/sensor-data` | Submit a real sensor reading |
| `GET`, `POST` | `/api/irrigation` | Read irrigation state and control pumps |
| `GET` | `/api/alerts` | Review nursery alerts |
| `GET` | `/api/reports/summary` | Dashboard KPIs |

## Data and hardware

By default, Greenkeeper produces realistic readings using the local simulator. A physical ESP32 or another sensor device can later submit readings through `POST /api/sensor-data` without changing the dashboard.

Runtime database data and server logs are intentionally excluded from Git, so each deployment can maintain its own nursery data.
