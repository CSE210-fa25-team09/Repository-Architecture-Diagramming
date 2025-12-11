# Architecture Decision Record (ADR)

ADR #: 006  
Title: Monitoring with Sentry.io  
Date: 2025-12-8  
Status: Proposed

## 1. Context

After the application is up and running, we have to collect data on its performance in order to ensure the health of the web app as well as gauge user experience and identify areas that can be improved on or fixed. Our web app have a simple user interface with only a few input options and pages.

Metrics we need to track:
- Downtime/outages (there should be none)
- Frequency of errors
- Type of error
- Page and other frontend component response times
- Backend API response time
- Most searched repositories

Requirements:
- Capable of tracking the metrics detailed above
- Free and/or open source
- Simple: we don't want large amounts of data
- Fast: initializing the instrumentation shouldn't add significant overhead to app load times


## 2. Decision

We chose to go with Sentry.io to monitor the web app.

**Sentry suits our needs because:**
- Supports both React and Express
- Clean dashboard interface for visualization of metrics
- Lightweight: because it's a SaaS platform, only requires a small dependency to be installed on our end
- Easy to use with helpful documentation
- Simple: tracks errors by default, and we add traces ourselves for monitoring performance
- Has sourcemaps for React and Express for more detailed error debugging help


## 3. Alternatives Considered

* TrackJS
    * Pros: Easy to configure, clean metrics dashboard
    * Cons: Only tracks errors

* OpenTelemetry
    * Pros: Open source, supports many languages and frameworks, fast
    * Cons: Lacks auto-instrumentation options for React, too complex (overkill for our web app), deprecated and out-of-date docs, requires installing OpenTelemetry Collector separately to aggregate data

* Prometheus
    * Pros: Open source, detailed documentation, autodetection of services
    * Cons: Not for long-term logging, requires learning PromQL to analyze data


## 4. Consequences

### Positive Outcomes
- Fast and easy to set up monitoring
- Code-level visibility of error messages
- We have all our metrics displayed in one place with data visualization and filtering

### Negative Outcomes / Risks
- Has too many features we don't use, resulting in a cluttered dashboard
- Free tier doesn't handle high volumes of logs or error messages
- Difficult to transfer over to a different monitoring software if our needs exceed what Sentry offers


## 5. Implementation Notes

- Packages used: @sentry/react, @sentry/node
- Initialize Sentry in frontend and backend separately
- In backend, initailize in error handler in server.js
- In frontend, use tracing integration to track response from backend and add metric counting on buttons and input
- Collected data can be viewed on Sentry dashboard website


## 6. References

- TrackJS [https://trackjs.com](https://trackjs.com)
* OpenTelemetry
    * [https://opentelemetry.io/docs/](https://opentelemetry.io/docs/)
    * [https://opentelemetry.io/docs/languages/js/exporters/](https://opentelemetry.io/docs/languages/js/exporters/)
    * [https://www.npmjs.com/package/@opentelemetry/sdk-trace-node](https://www.npmjs.com/package/@opentelemetry/sdk-trace-node)
    * [https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/plugin-react-load](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/plugin-react-load)
    * [https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-document-load](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-document-load)
* Prometheus
    * [https://prometheus.io/docs/introduction/overview/](https://prometheus.io/docs/introduction/overview/)
    * [https://medium.com/@dogabudak/pros-and-cons-of-prometheus-b04ab3afcbf7](https://medium.com/@dogabudak/pros-and-cons-of-prometheus-b04ab3afcbf7)
- Sentry [https://docs.sentry.io](https://docs.sentry.io)