import * as Sentry from "@sentry/react"
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom"
import React from "react"

Sentry.init({
  dsn: "https://08acb0f98be189573a33a3ada79c7624@o4510504926904320.ingest.us.sentry.io/4510504928673792",

  sendDefaultPii: true,
  enableLogs: true,

  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],

  tracesSampleRate: 1.0,
})
