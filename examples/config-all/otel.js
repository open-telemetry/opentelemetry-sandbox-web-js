import { PageViewEventInstrumentation } from '@opentelemetry/instrumentation-page-view';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SessionStorageSessionManager } from '@opentelemetry/web-common';
import { configureWebSDK, getResource, getSessionManager } from '@opentelemetry/web-configuration';

const shutdown = configureWebSDK(
  {
    logRecordProcessors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
    resource: getResource({
      serviceName: 'My app',
    }),
    sessionIdProvider: getSessionManager()
  },
  [
    new PageViewEventInstrumentation(),
    new XMLHttpRequestInstrumentation()
  ]
);

window.addEventListener('load', () => {
  const btn2 = document.getElementById('button2');
  btn2.addEventListener('click', shutdown);
});
