import { PageViewEventInstrumentation } from '@opentelemetry/instrumentation-page-view';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { configureWebSDK, getResource, getSessionManager } from '@opentelemetry/web-configuration';
import { DefaultSessionLifecycle, WebLocalStorage } from '@opentelemetry/web-common';

const sessionObserver = {
  onSessionStarted: (session) => {
    console.log(`session started:`, session)
  },
  onSessionEnded: (session) => {
    console.log(`session ended:`, session)
  } 
}

let count = 0;
const customIdGenerator = {
  generateSessionId: () => {
    return ++count;
  }
}

const sessionLifecycle = new DefaultSessionLifecycle();

configureWebSDK(
  {
    logRecordProcessors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
    resource: getResource({
      serviceName: 'My app',
    }),
    sessionIdProvider: getSessionManager({
      sessionStorage: new WebLocalStorage(),
      sessionIdGenerator: customIdGenerator,
      sessionObserver: sessionObserver,
      sessionLifecycle: new DefaultSessionLifecycle(20000, 10000)
    })
  },
  [
    new PageViewEventInstrumentation(),
    new XMLHttpRequestInstrumentation()
  ]
);
