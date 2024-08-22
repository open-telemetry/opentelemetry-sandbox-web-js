import { PageViewEventInstrumentation } from '@opentelemetry/instrumentation-page-view';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { configureWebSDK } from '@opentelemetry/web-configuration';

const shutdown = configureWebSDK(
  {
    serviceName: 'My app',
    logRecordProcessors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
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
