import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://e1e25492eb11350a4088bfc0f66fc155@o4511430177521664.ingest.us.sentry.io/4511430188924928",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
