const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiDocument = require('./openapi.json');
const { statements, serializeTask } = require('./db'); // creates tasks.db + the tasks table, seeds it if empty

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/tasks', (req, res) => {
  res.json(statements.getAll.all().map(serializeTask));
});

app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = statements.getById.get(id);
  if (!row) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.json(serializeTask(row));
});

app.post('/tasks', (req, res) => {
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required and cannot be empty' });
  }
  const trimmedTitle = title.trim();
  const result = statements.insert.run(trimmedTitle, 0);
  res.status(201).json({ id: Number(result.lastInsertRowid), title: trimmedTitle, done: false });
});

app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = statements.getById.get(id);
  if (!existing) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body || {};

  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: 'Provide at least title or done to update' });
  }
  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return res.status(400).json({ error: 'title must be a non-empty string' });
  }
  if (done !== undefined && typeof done !== 'boolean') {
    return res.status(400).json({ error: 'done must be true or false' });
  }

  const newTitle = title !== undefined ? title.trim() : existing.title;
  const newDoneValue = done !== undefined ? (done ? 1 : 0) : existing.done;

  statements.update.run(newTitle, newDoneValue, id);
  res.json({ id, title: newTitle, done: Boolean(newDoneValue) });
});

app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = statements.remove.run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.status(204).send();
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

// Malformed JSON bodies come back as a clean JSON error, not Express's default HTML page
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Docs at http://localhost:${PORT}/docs`);
});
