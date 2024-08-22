import { PageViewEventInstrumentation } from '@opentelemetry/instrumentation-page-view';
// import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { configureEventsSDK } from '@opentelemetry/web-configuration';

const shutdown = configureEventsSDK(
  {
    serviceName: 'My app',
    logRecordProcessors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
  },
  [
    new PageViewEventInstrumentation(),
    // new XMLHttpRequestInstrumentation()
  ]
);

window.addEventListener('load', () => {
  const btn2 = document.getElementById('button2');
  btn2.addEventListener('click', shutdown);
});
