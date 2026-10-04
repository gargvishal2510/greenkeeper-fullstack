import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { initDb } from './db.js';
import { startSimulator } from './services/simulator.js';

import zonesRouter from './routes/zones.js';
import sensorRouter from './routes/sensor.js';
import batchesRouter from './routes/batches.js';
import irrigationRouter from './routes/irrigation.js';
import alertsRouter from './routes/alerts.js';
import reportsRouter from './routes/reports.js';
import tasksRouter from './routes/tasks.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.set('io', io);
app.use(cors());
app.use(express.json());

// simple request log, handy while demoing to a mentor
app.use((req, res, next) => {
  console.log(`${new Date().toISOString().slice(11, 19)}  ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.DATA_MODE || 'calc', time: new Date().toISOString() });
});

app.use('/api/zones', zonesRouter);
app.use('/api/sensor-data', sensorRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/irrigation', irrigationRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/tasks', tasksRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[socket] client disconnected: ${socket.id}`));
});

async function main() {
  await initDb();
  server.listen(PORT, () => {
    console.log(`\nGreenkeeper backend running on http://localhost:${PORT}`);
    console.log(`Health check:  http://localhost:${PORT}/api/health\n`);
  });
  startSimulator(io, Number(process.env.SIM_INTERVAL_MS) || 15000);
}

main();
