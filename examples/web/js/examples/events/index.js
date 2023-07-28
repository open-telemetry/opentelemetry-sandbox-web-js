const { logs } = require('@opentelemetry/sandbox-api-logs');
const { events } = require('@opentelemetry/sandbox-api-events');
const { EventEmitterProvider } = require('@opentelemetry/sandbox-sdk-events');
const {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} = require('@opentelemetry/sandbox-sdk-logs');
const { OTLPLogExporter } = require('@opentelemetry/sandbox-exporter-logs-otlp-http');

// The Events SDK has a dependency on the Logs SDK - a global LoggerProvider must be
// registered. Any processing (e.g. export) is done through the Logs SDK.
const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
);
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new OTLPLogExporter())
);
logs.setGlobalLoggerProvider(loggerProvider);

// Register a global EventEmitterProvider -
// This would be used by instrumentations, similar to how the global TracerProvider,
// LoggerProvider and MeterProvider work.
const eventEmitterProvider = new EventEmitterProvider();
events.setGlobalEventEmitterProvider(eventEmitterProvider);

// setup instrumentation
window.addEventListener('load', prepareClickEvent);

function prepareClickEvent() {
  // get an EventEmitter from the global EventEmitterProvider
  const eventEmitter = events.getEventEmitter('default');

  const element = document.getElementById('button1');
  element.addEventListener('click', onClick);
  
  function onClick() {
    // emit an event
    eventEmitter.emit({
      name: 'myEvent',
      data: {
        field1: 'abc',
        field2: 123
      }
    });
  };
}
