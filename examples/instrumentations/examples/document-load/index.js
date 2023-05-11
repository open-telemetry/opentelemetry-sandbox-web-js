import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { registerInstrumentations } from '@opentelemetry/sandbox-instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/sandbox-instrumentation-document-load';
import { ZoneContextManager } from '@opentelemetry/sandbox-context-zone';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

const provider = new WebTracerProvider();

// Note: For production consider using the "BatchSpanProcessor" to reduce the number of requests
// to your exporter. Using the SimpleSpanProcessor here as it sends the spans immediately to the
// exporter without delay
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation()
  ]
});