import { Router } from 'express';
import { db } from '../db.js';

const router = Router();
const allowedFields = ['title', 'zone', 'assignee', 'dueDate', 'completed'];

function taskPayload(body) {
  return Object.fromEntries(allowedFields
    .filter(field => body[field] !== undefined)
    .map(field => [field, field === 'completed' ? Boolean(body[field]) : String(body[field]).trim()]));
}

// GET /api/tasks?assignee=Aman%20Verma
router.get('/', async (req, res) => {
  await db.read();
  let tasks = [...(db.data.tasks || [])];
  if (req.query.assignee) tasks = tasks.filter(task => task.assignee === req.query.assignee);
  tasks.sort((a, b) => Number(a.completed) - Number(b.completed) || String(a.dueDate).localeCompare(String(b.dueDate)));
  res.json(tasks);
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const payload = taskPayload(req.body);
  if (!payload.title || !payload.zone || !payload.assignee) {
    return res.status(400).json({ error: 'title, zone, and assignee are required' });
  }
  await db.read();
  db.data.tasks ||= [];
  db.data.meta ||= {};
  const task = {
    id: db.data.meta.nextTaskId || Math.max(0, ...db.data.tasks.map(item => Number(item.id) || 0)) + 1,
    title: payload.title,
    zone: payload.zone,
    assignee: payload.assignee,
    dueDate: payload.dueDate || new Date().toISOString().slice(0, 10),
    completed: false,
  };
  db.data.meta.nextTaskId = task.id + 1;
  db.data.tasks.push(task);
  await db.write();
  res.status(201).json(task);
});

// PATCH /api/tasks/:id (admin edits assignments; staff updates completion)
router.patch('/:id', async (req, res) => {
  await db.read();
  const task = (db.data.tasks || []).find(item => item.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const payload = taskPayload(req.body);
  if (payload.title === '' || payload.zone === '' || payload.assignee === '') {
    return res.status(400).json({ error: 'title, zone, and assignee cannot be empty' });
  }
  Object.assign(task, payload);
  await db.write();
  res.json(task);
});

export default router;
