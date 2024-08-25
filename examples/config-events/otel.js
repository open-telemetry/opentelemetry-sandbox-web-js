import { PageViewEventInstrumentation } from '@opentelemetry/instrumentation-page-view';
import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { configureEventsSDK, getResource, getSessionManager } from '@opentelemetry/web-configuration';

const shutdown = configureEventsSDK(
  {
    resource: getResource({
      serviceName: 'My app'
    }),
    sessionIdProvider: getSessionManager(),
    logRecordProcessors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
  },
  [
    new PageViewEventInstrumentation()
  ]
);

window.addEventListener('load', () => {
  const btn2 = document.getElementById('button2');
  btn2.addEventListener('click', shutdown);
});
