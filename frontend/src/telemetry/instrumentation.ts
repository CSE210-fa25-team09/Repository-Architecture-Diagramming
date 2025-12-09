// src/otel/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { ZoneContextManager } from "@opentelemetry/context-zone"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, } from "@opentelemetry/semantic-conventions"

import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load"
import { UserInteractionInstrumentation } from "@opentelemetry/instrumentation-user-interaction"

const sdk = new NodeSDK({});

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "repo-arch-diagramming-frontend",
  [ATTR_SERVICE_VERSION]:
    import.meta.env.VITE_APP_VERSION ?? "0.1.0",
})

const exporter = new OTLPTraceExporter({
  url: import.meta.env.VITE_OTEL_EXPORTER_OTLP_URL ?? "http://localhost:4318/v1/traces",
})

const processor = new BatchSpanProcessor(exporter);

const provider = new WebTracerProvider({
  resource: resource,
  spanProcessors: [processor],
});

provider.register({
  contextManager: new ZoneContextManager(),
})

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new UserInteractionInstrumentation({}),
  ],
})

sdk.start();