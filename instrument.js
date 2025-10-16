const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://9f751c657a64de407c6f18ec6f72f5d4@o4510201789808640.ingest.us.sentry.io/4510201803636736",
  sendDefaultPii: true,
  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});
