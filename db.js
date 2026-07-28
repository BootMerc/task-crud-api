const { DatabaseSync: Database } = require('node:sqlite');
const db = new Database('tasks.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )
`);
// Seed only if the table is empty, so restarts never duplicate the examples.
// Wrapped in BEGIN/COMMIT so the seed is all-or-nothing (node:sqlite has no
// db.transaction() helper, so this is that pattern spelled out by hand).
const countStmt = db.prepare('SELECT COUNT(*) AS count FROM tasks');
if (countStmt.get().count === 0) {
  const seedStmt = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  const seedRows = [
    { title: 'Buy milk', done: 0 },
    { title: 'Walk the dog', done: 1 },
    { title: 'Finish backend assignment', done: 0 }
  ];
  db.exec('BEGIN');
  for (const row of seedRows) seedStmt.run(row.title, row.done);
  db.exec('COMMIT');
}
// Prepared once, reused for every request — and every value below is bound
// as a parameter (?), never string-concatenated into the SQL.
const statements = {
  getAll: db.prepare('SELECT * FROM tasks'),
  getById: db.prepare('SELECT * FROM tasks WHERE id = ?'),
  insert: db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)'),
  update: db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM tasks WHERE id = ?')
};
// SQLite stores `done` as 0/1 — convert back to a real boolean so the API
// response shape never changes from what Assignment 1 returned
function serializeTask(row) {
  return { id: Number(row.id), title: row.title, done: Boolean(row.done) };
}

module.exports = { db, statements, serializeTask };
