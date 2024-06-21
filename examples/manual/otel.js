const { PageViewEventInstrumentation } = require('@opentelemetry/instrumentation-page-view');
// const { XMLHttpRequestInstrumentation } = require('@opentelemetry/instrumentation-xml-http-request');
const { events } = require('@opentelemetry/api-events');
const { trace } = require('@opentelemetry/api');
const { EventLoggerProvider } = require('@opentelemetry/sdk-events');
const {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} = require('@opentelemetry/sdk-logs');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { WebTracerProvider } = require('@opentelemetry/sdk-trace-web');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const {
  SessionSpanProcessor,
  SessionLogRecordProcessor,
  SessionStorageSessionManager
} = require('@opentelemetry/web-common');
const { browserDetector } = require('@opentelemetry/opentelemetry-browser-detector');
const { SEMRESATTRS_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const {
  Resource,
  detectResourcesSync,
  browserDetector: processBrowserDetector
} = require('@opentelemetry/resources');

// configure resources
let resource = detectResourcesSync({
  detectors: [browserDetector, processBrowserDetector] 
})
resource = resource.merge(new Resource({
  [SEMRESATTRS_SERVICE_NAME]: 'My App'
}));

// configure global TracerProvider
const tracerProvider = new WebTracerProvider({ resource });
tracerProvider.addSpanProcessor(
  new SimpleSpanProcessor(new ConsoleSpanExporter())
);
trace.setGlobalTracerProvider(tracerProvider);

// configure global EventLoggerProvider
const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
);
const eventLoggerProvider = new EventLoggerProvider(loggerProvider);
events.setGlobalEventLoggerProvider(eventLoggerProvider);

// configure sessions
const sessionManager = new SessionStorageSessionManager();
tracerProvider.addSpanProcessor(new SessionSpanProcessor(sessionManager));
loggerProvider.addLogRecordProcessor(new SessionLogRecordProcessor(sessionManager));

registerInstrumentations({
  instrumentations: [
    new PageViewEventInstrumentation(),
    // new XMLHttpRequestInstrumentation(),
  ],
});
