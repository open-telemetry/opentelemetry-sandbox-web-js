/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { InstrumentationConfig } from '@opentelemetry/sandbox-instrumentation';
import { Event } from '@opentelemetry/sandbox-api-events';
import { ReportOpts, Metric } from 'web-vitals';
/**
 * WebVitalsPlugin Config
 */
export interface WebVitalsInstrumentationConfig
  extends InstrumentationConfig,
    ReportOpts {
  /**
   * List of web-vitals to instrument ('CLS', 'FID', 'LCP', 'FCP', 'INP', 'TTFB')
   * By default 'CLS', 'FID and 'LCP' are instrumented
   */
  metricsToTrack?: Metric['name'][];
  applyCustomEventData?: ApplyCustomEventDataFunction;
}

export interface ApplyCustomEventDataFunction {
  (event: Event): void;
}
