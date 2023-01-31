'use strict';

const { DiagConsoleLogger, DiagLogLevel, diag } = require('@opentelemetry/api');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
// const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
// const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Optional and only needed to see the internal diagnostic logging (during development)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const metricExporter = new OTLPMetricExporter({});

const meterProvider = new MeterProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'basic-metric-service',
  }),
});

meterProvider.addMetricReader(new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 1000,
}));

const meter = meterProvider.getMeter('example-exporter-collector');

const requestCounter = meter.createCounter('requests', {
  description: 'Example of a Counter',
});

const upDownCounter = meter.createUpDownCounter('test_up_down_counter', {
  description: 'Example of a UpDownCounter',
});

const histogram = meter.createHistogram('test_histogram', {
  description: 'Example of a Histogram',
});

const attributes = { pid: process.pid, environment: 'staging' };

setInterval(() => {
  requestCounter.add(1, attributes);
  upDownCounter.add(Math.random() > 0.5 ? 1 : -1, attributes);
  histogram.record(Math.random(), attributes);
}, 1000);
