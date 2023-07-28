# OpenTelemetry Events SDK

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This package provides an experimental Events SDK implementation. The Events SDK is implemented on top of the Logs SDK. A global LoggerProvider must be registered in order for the Events SDK to work.

## Installation

```bash
npm install --save @opentelemetry/api-events
npm install --save @opentelemetry/sdk-events
```

## Usage

Here is an exammple of configuring and using the Events SDK:

```js
const { logs } = require('@opentelemetry/sandbox-api-logs');
const { events } = require('@opentelemetry/sandbox-api-events');
const { EventEmitterProvider } = require('@opentelemetry/sandbox-sdk-events');
const {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} = require('@opentelemetry/sandbox-sdk-logs');

// The Events SDK has a dependency on the Logs SDK - a global LoggerProvider must be
// registered. Any processing of events (e.g. export) is done through the Logs SDK.
const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
);
logs.setGlobalLoggerProvider(loggerProvider);

// Register a global EventEmitterProvider -
// This would be used by instrumentations, similar to how the global TracerProvider,
// LoggerProvider and MeterProvider work.
const eventEmitterProvider = new EventEmitterProvider();
events.setGlobalEventEmitterProvider(eventEmitterProvider);

// get an EventEmitter from the global EventEmitterProvider
const eventEmitter = events.getEventEmitter('default');

// emit an event
eventEmitter.emit({
  name: 'myEvent',
  data: {
    field1: 'abc',
    field2: 123
  }
});
```

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/sdk-logs
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fsdk%2Dlogs.svg
