import express from 'express'
import * as Sentry from '@sentry/node'

const app = express()
app.use(express.json())

// Monitoring (Sentry)
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN })
  app.use(Sentry.Handlers.requestHandler())
}

// In-memory data
let todos = [{ id: 1, title: 'Primer TODO', done: false }]
let nextId = 2

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// CRUD
app.get('/todos', (_req, res) => res.json(todos))

app.post('/todos', (req, res) => {
  const { title } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title es requerido' })
  const todo = { id: nextId++, title, done: false }
  todos.push(todo)
  res.status(201).json(todo)
})

app.put('/todos/:id', (req, res) => {
  const id = Number(req.params.id)
  const idx = todos.findIndex(t => t.id === id)
  if (idx === -1) return res.status(404).json({ error: 'no encontrado' })
  const { title, done } = req.body || {}
  if (title !== undefined) todos[idx].title = title
  if (done !== undefined) todos[idx].done = !!done
  res.json(todos[idx])
})

app.delete('/todos/:id', (req, res) => {
  const id = Number(req.params.id)
  const len = todos.length
  todos = todos.filter(t => t.id !== id)
  if (todos.length === len) return res.status(404).json({ error: 'no encontrado' })
  res.status(204).end()
})

// Boom test
app.get('/boom', (_req, _res) => {
  throw new Error('Boom! Error de ejemplo')
})

// Error middlewares
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler())
}
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'internal_error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`)
})

export default app
