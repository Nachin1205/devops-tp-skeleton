import "../instrument.js";
import * as Sentry from "@sentry/node";
import http from "node:http";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

// Crear servidor HTTP manualmente
const server = http.createServer(app);

// Captura errores del servidor
server.on("error", (err) => {
  Sentry.captureException(err);
  console.error("Error en el servidor:", err);
});

// Captura errores globales no manejados
process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
  console.error("Excepción no capturada:", err);
});

process.on("unhandledRejection", (reason) => {
  Sentry.captureException(reason);
  console.error("Promesa rechazada sin catch:", reason);
});

// Iniciar servidor (solo si no estamos en test)
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
  });
}
