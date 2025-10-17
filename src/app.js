import * as Sentry from "@sentry/node";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 🧠 Sentry ya se inicializa en instrument.js, así que no lo re-inicializamos aquí
const app = express();

// --- Middlewares de Sentry (request + tracing) ---
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// --- Logger HTTP simple ---
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - inicio;
    console.log(JSON.stringify({
      nivel: "info",
      evento: "http_access",
      metodo: req.method,
      ruta: req.originalUrl,
      estado: res.statusCode,
      duracion_ms: ms
    }));
  });
  next();
});

// --- Configuración base ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());

// --- Datos en memoria ---
let todos = [
  { id: 1, title: "Primer TODO", done: false }
];
let nextId = 2;

const parseId = (raw) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// --- Rutas ---
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/todos", (_req, res) => {
  res.json(todos);
});

app.get("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido: debe ser numérico" });

  const todo = todos.find(t => t.id === id);
  if (!todo) {
    console.warn(JSON.stringify({ nivel: "warn", evento: "todo_no_encontrado", id }));
    return res.status(404).json({ error: "no encontrado" });
  }
  res.json(todo);
});

app.post("/todos", (req, res) => {
  const title = (req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "title es requerido" });
  if (title.length > 120) return res.status(400).json({ error: "title demasiado largo (máx 120)" });

  const todo = { id: nextId++, title, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido: debe ser numérico" });

  const todo = todos.find(t => t.id === id);
  if (!todo) {
    console.warn(JSON.stringify({ nivel: "warn", evento: "todo_no_encontrado", id }));
    return res.status(404).json({ error: "no encontrado" });
  }

  const { title, done } = req.body ?? {};
  if (title !== undefined) {
    const t = String(title).trim();
    if (!t) return res.status(400).json({ error: "title no puede ser vacío" });
    if (t.length > 120) return res.status(400).json({ error: "title demasiado largo (máx 120)" });
    todo.title = t;
  }
  if (done !== undefined) {
    if (typeof done !== "boolean") {
      return res.status(400).json({ error: "done debe ser boolean" });
    }
    todo.done = done;
  }
  res.json(todo);
});

app.delete("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido: debe ser numérico" });

  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) {
    console.warn(JSON.stringify({ nivel: "warn", evento: "todo_no_encontrado", id }));
    return res.status(404).json({ error: "no encontrado" });
  }
  todos.splice(idx, 1);
  res.status(204).end();
});

// --- Ruta para probar errores (Sentry) ---
app.get("/boom", () => {
  throw new Error("Boom! Error de ejemplo");
});

// --- Middleware de error de Sentry ---
app.use(Sentry.Handlers.errorHandler());

// --- Middleware de error genérico ---
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    nivel: "error",
    evento: "unhandled_error",
    mensaje: err.message,
    ruta: req.originalUrl,
    stack: err.stack
  }));
  res.status(500).json({ error: "error interno" });
});

export default app;
