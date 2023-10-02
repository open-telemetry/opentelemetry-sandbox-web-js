# OpenTelemetry page view Instrumentation for web

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides auto instrumentation for page view

## Installation

```bash
npm install --save @opentelemetry/instrumentation-page-view
```

## Usage

```js
import {
    LoggerProvider,
    ConsoleLogRecordExporter,
    SimpleLogRecordProcessor,
} from '@opentelemetry/sandbox-sdk-logs';
import {
    EventEmitterProvider
} from '@opentelemetry/sandbox-sdk-events';
import { PageViewEventInstrumentation } from '@opentelemetry/sandbox-instrumentation-page-view';
import { registerInstrumentations } from '@opentelemetry/sandbox-instrumentation';
import { logs } from '@opentelemetry/sandbox-api-logs';
import { events } from '@opentelemetry/sandbox-api-events';

const exporter = new ConsoleLogRecordExporter();
const provider = new LoggerProvider();
const logRecordProcessor = new SimpleLogRecordProcessor(exporter);
provider.addLogRecordProcessor(logRecordProcessor);
logs.setGlobalLoggerProvider(provider);
const eventEmitterProvider = new EventEmitterProvider();
events.setGlobalEventEmitterProvider(eventEmitterProvider);

registerInstrumentations({
  instrumentations: [new PageViewEventInstrumentation()],
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
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-page-view
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-page-view.svg
