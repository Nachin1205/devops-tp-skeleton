import express from "express";
import Sentry from "../instrument.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

// --- Integración de Express con Sentry ---
Sentry.addIntegration(Sentry.expressIntegration({ app }));

// --- Configuración base ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());

// --- Datos en memoria ---
let todos = [{ id: 1, title: "Primer TODO", done: false }];
let nextId = 2;

// --- Función auxiliar ---
const parseId = (raw) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// --- Middleware: logger HTTP simple + detección de requests lentos ---
app.use((req, res, next) => {
  const inicio = Date.now();

  Sentry.addBreadcrumb({
    category: "http",
    message: `Petición ${req.method} ${req.originalUrl}`,
    level: "info",
  });

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

    console.log(JSON.stringify(log));

    // Detectar request lento (>1s)
    if (duracion > 1000) {
      Sentry.captureMessage(`Request lenta: ${req.method} ${req.originalUrl} (${duracion}ms)`, "warning");
    }
  });

  next();
});

// --- Healthcheck ---
app.get("/health", (_req, res) => {
  Sentry.captureMessage("Chequeo de salud solicitado", "info");
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Listar todos ---
app.get("/todos", (_req, res) => {
  Sentry.addBreadcrumb({ category: "todo", message: "Listar todos", level: "info" });
  res.json(todos);
});

// --- Obtener todo por ID ---
app.get("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    Sentry.captureMessage("ID inválido en /todos/:id", "warning");
    return res.status(400).json({ error: "id inválido: debe ser numérico" });
  }

  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    Sentry.captureMessage(`TODO no encontrado: ${id}`, "warning");
    return res.status(404).json({ error: "no encontrado" });
  }

  Sentry.addBreadcrumb({ category: "todo", message: `Se consultó TODO #${id}`, level: "info" });
  res.json(todo);
});

// --- Crear TODO ---
app.post("/todos", (req, res) => {
  const title = (req.body?.title || "").trim();

  if (!title) {
    Sentry.captureMessage("Intento de crear TODO sin título", "warning");
    return res.status(400).json({ error: "title es requerido" });
  }
  if (title.length > 120) {
    Sentry.captureMessage("Título demasiado largo en TODO", "warning");
    return res.status(400).json({ error: "title demasiado largo (máx 120)" });
  }

  const todo = { id: nextId++, title, done: false };
  todos.push(todo);

  Sentry.captureEvent({
    message: "Nuevo TODO creado",
    level: "info",
    extra: { id: todo.id, title: todo.title },
  });

  res.status(201).json(todo);
});

// --- Modificar TODO ---
app.put("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido: debe ser numérico" });

  const todo = todos.find((t) => t.id === id);
  if (!todo) {
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
    Sentry.captureMessage(`TODO modificado: ${todo.id}`, "info");
  });

  res.json(todo);
});

// --- Eliminar TODO ---
app.delete("/todos/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido: debe ser numérico" });

  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) {
    Sentry.captureMessage(`Intento de eliminar TODO inexistente: ${id}`, "warning");
    return res.status(404).json({ error: "no encontrado" });
  }

  todos.splice(idx, 1);
  Sentry.captureEvent({
    message: "TODO eliminado",
    level: "info",
    extra: { id },
  });

  res.status(204).end();
});


// --- Ruta para probar error controlado ---
app.get("/boom", (_req, _res) => {
  // Esto genera una excepción intencional
  try {
    throw new Error("Boom! Error de ejemplo controlado");
  } catch (err) {
    Sentry.captureException(err);
    throw err; // Para que el middleware de error también lo maneje
  }
});

// Middleware de errores (después de las rutas)
app.use(Sentry.expressErrorHandler);

// Tu middleware de errores personalizado (para mostrar respuesta amigable)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// --- Ruta para error no controlado ---
/*app.get("/crash", () => {
  // Esto rompe todo para probar captura global
  Sentry.captureMessage("Ruta crash ejecutada", "fatal");
  throw new Error("Crash total del servidor 😈");
}); */

// --- Middleware de error de Sentry ---
app.use(Sentry.expressErrorHandler());

// --- Middleware genérico de error ---
app.use((err, req, res, next) => {
  console.error({
    nivel: "error",
    evento: "unhandled_error",
    mensaje: err.message,
    ruta: req.originalUrl,
    stack: err.stack,
  });

  Sentry.captureException(err, {
    extra: { ruta: req.originalUrl, metodo: req.method },
  });

  res.status(500).json({ error: "error interno" });
});

export default app;
