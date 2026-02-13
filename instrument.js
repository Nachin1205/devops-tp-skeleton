import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const dsn = process.env.SENTRY_DSN;

// Debug (solo true/false, no imprime el DSN)
console.log("[Sentry] DSN cargado?", Boolean(dsn));

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

export default Sentry;
