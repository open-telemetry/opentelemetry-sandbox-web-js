import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { configureTraceSDK, getResource } from '@opentelemetry/web-configuration';

const shutdown = configureTraceSDK(
  {
    resource: getResource({
      serviceName: 'My app'
    }),
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
  },
  [
    new XMLHttpRequestInstrumentation()
  ]
);

window.addEventListener('load', () => {
  const btn2 = document.getElementById('button2');
  btn2.addEventListener('click', shutdown);
});
