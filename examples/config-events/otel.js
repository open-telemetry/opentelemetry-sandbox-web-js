import { PageViewEventInstrumentation } from '@opentelemetry/instrumentation-page-view';
import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { configureEventsSDK } from '@opentelemetry/web-configuration';

const shutdown = configureEventsSDK(
  {
    serviceName: 'My app',
    logRecordProcessors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
    sessionManager: new SessionStorageSessionManager()
  },
  [
    new PageViewEventInstrumentation()
  ]
);

window.addEventListener('load', () => {
  const btn2 = document.getElementById('button2');
  btn2.addEventListener('click', shutdown);
});
