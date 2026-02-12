import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const dsn = process.env.SENTRY_DSN;

console.log("[Sentry] DSN cargado?", Boolean(dsn));

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: true,
    integrations: [
      Sentry.httpIntegration(),
      nodeProfilingIntegration(),
      Sentry.consoleIntegration(),
      Sentry.expressIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
    enableLogs: true,
  });
} else {
  console.warn("[Sentry] SENTRY_DSN no definido. Sentry deshabilitado.");
}

export default Sentry;
