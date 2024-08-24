const { WebSDK } = require('@opentelemetry/sdk-web');
const { PageViewEventInstrumentation } = require('@opentelemetry/instrumentation-page-view');
const { XMLHttpRequestInstrumentation } = require('@opentelemetry/instrumentation-xml-http-request');
const { ConsoleLogRecordExporter, SimpleLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { SessionStorageSessionManager } = require('@opentelemetry/web-common');

const sdk = new WebSDK({
  logRecordProcessors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
  instrumentations: [
    new PageViewEventInstrumentation(),
    new XMLHttpRequestInstrumentation()
  ],
  sessionManager: new SessionStorageSessionManager()
});

sdk.start();
