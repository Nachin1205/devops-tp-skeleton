import express from "express";
import Sentry from "../instrument.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

Sentry.addIntegration(Sentry.expressIntegration(app));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());

let todos = [{ id: 1, title: "Primer TODO", done: false }];
let nextId = 2;

const parseId = (raw) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

app.use((req, res, next) => {
  const inicio = Date.now();

  Sentry.logger.info(`Petición ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duracion = Date.now() - inicio;
    const log = {
      nivel: "info",
      evento: "http_access",
      metodo: req.method,
      ruta: req.originalUrl,
      estado: res.statusCode,
      duracion_ms: duracion,
    };

    Sentry.logger.debug(JSON.stringify(log));

    if (duracion > 1000) {
      Sentry.logger.warn(`Request lenta: ${req.method} ${req.originalUrl} (${duracion}ms)`);
      Sentry.captureMessage(`Request lenta: ${req.method} ${req.originalUrl} (${duracion}ms)`, "warning");
    }
  });

  next();
});

app.get("/health", (_req, res) => {
  Sentry.logger.info("Chequeo de salud solicitado");
  Sentry.captureMessage("Chequeo de salud solicitado", "info");
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/todos", (_req, res) => {
  Sentry.logger.info("Listar todos");
  res.json(todos);
});

app.get("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    Sentry.logger.warn("ID inválido en /todos/:id");
    Sentry.captureMessage("ID inválido en /todos/:id", "warning");
    return res.status(400).json({ error: "id inválido: debe ser numérico" });
  }

  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    Sentry.logger.warn(`TODO no encontrado: ${id}`);
    Sentry.captureMessage(`TODO no encontrado: ${id}`, "warning");
    return res.status(404).json({ error: "no encontrado" });
  }

  Sentry.logger.info(`Se consultó TODO #${id}`);
  res.json(todo);
});

app.post("/todos", (req, res) => {
  const title = (req.body?.title || "").trim();

  if (!title) {
    Sentry.logger.warn("Intento de crear TODO sin título");
    Sentry.captureMessage("Intento de crear TODO sin título", "warning");
    return res.status(400).json({ error: "title es requerido" });
  }
  if (title.length > 120) {
    Sentry.logger.warn("Título demasiado largo en TODO");
    Sentry.captureMessage("Título demasiado largo en TODO", "warning");
    return res.status(400).json({ error: "title demasiado largo (máx 120)" });
  }

  const todo = { id: nextId++, title, done: false };
  todos.push(todo);

  Sentry.logger.info(`Nuevo TODO creado: ${todo.id} (${todo.title})`);
  Sentry.captureEvent({
    message: "Nuevo TODO creado",
    level: "info",
    extra: { id: todo.id, title: todo.title },
  });

  res.status(201).json(todo);
});

app.put("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido: debe ser numérico" });

  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    Sentry.logger.warn(`Intento de modificar TODO inexistente: ${id}`);
    Sentry.captureMessage(`Intento de modificar TODO inexistente: ${id}`, "warning");
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

  Sentry.withScope((scope) => {
    scope.setTag("accion", "modificacion_todo");
    scope.setExtra("todo_modificado", todo);
    Sentry.logger.info(`TODO modificado: ${todo.id}`);
    Sentry.captureMessage(`TODO modificado: ${todo.id}`, "info");
  });

  res.json(todo);
});

app.delete("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido: debe ser numérico" });

  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) {
    Sentry.logger.warn(`Intento de eliminar TODO inexistente: ${id}`);
    Sentry.captureMessage(`Intento de eliminar TODO inexistente: ${id}`, "warning");
    return res.status(404).json({ error: "no encontrado" });
  }

  todos.splice(idx, 1);
  Sentry.logger.info(`TODO eliminado: ${id}`);
  Sentry.captureEvent({
    message: "TODO eliminado",
    level: "info",
    extra: { id },
  });

  res.status(204).end();
});

app.get("/boom", (_req, _res) => {
  try {
    throw new Error("Boom! Error de ejemplo controlado");
  } catch (err) {
    Sentry.logger.error("Error controlado en /boom");
    Sentry.captureException(err);
    throw err;
  }
});

app.use(Sentry.expressErrorHandler());

app.use((err, req, res, next) => {
  Sentry.logger.error(`Error no controlado en ${req.method} ${req.originalUrl}: ${err.message}`);
  Sentry.captureException(err, {
    extra: { ruta: req.originalUrl, metodo: req.method },
  });
  res.status(500).json({ error: "error interno" });
});

export default app;
