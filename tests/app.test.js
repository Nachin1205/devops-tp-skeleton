// Tests de integración con node:test + supertest
import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

// Verifica que el healthcheck funcione
test('GET /health responde ok', async () => {
  const res = await request(app).get('/health')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'ok')
})

// Recorre el CRUD completo en memoria
test('CRUD /todos en memoria', async () => {
  // lista inicial
  let res = await request(app).get('/todos')
  assert.equal(res.status, 200)
  const initial = res.body.length

  // crear
  res = await request(app).post('/todos').send({ title: 'nuevo' })
  assert.equal(res.status, 201)
  assert.equal(res.body.title, 'nuevo')
  const id = res.body.id

  // actualizar
  res = await request(app).put(`/todos/${id}`).send({ done: true })
  assert.equal(res.status, 200)
  assert.equal(res.body.done, true)

  // borrar
  res = await request(app).delete(`/todos/${id}`)
  assert.equal(res.status, 204)

  // confirmamos que hay igual cantidad que al inicio
  res = await request(app).get('/todos')
  assert.equal(res.status, 200)
  assert.equal(res.body.length, initial)
})
