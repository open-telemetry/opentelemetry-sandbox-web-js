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

import {
  InstrumentationBase,
  InstrumentationConfig,
} from '@opentelemetry/instrumentation';
import {
  onCLS,
  onFCP,
  onFID,
  onINP,
  onLCP,
  onTTFB,
  ReportOpts,
  Metric,
} from 'web-vitals';
import { events } from '@opentelemetry/sandbox-api-events';

import { VERSION } from './version';

/**
 * WebVitalsPlugin Config
 */
export interface WebVitalsInstrumentationConfig
  extends InstrumentationConfig,
    ReportOpts {}

export class WebVitalsInstrumentation extends InstrumentationBase {
  constructor(config?: WebVitalsInstrumentationConfig) {
    super('@opentelemetry/sandbox-instrumentation-web-vitals', VERSION, config);
  }

  private _onReport(metric: Metric) {
    const eventEmitter = events.getEventEmitter('web-vitals', VERSION);
    eventEmitter.emit({
      name: metric.name,
      attributes: {
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        rating: metric.rating,
        navigationType: metric.navigationType,
      },
    });
  }

  override enable() {
    onCLS(this._onReport);
    onFCP(this._onReport);
    onFID(this._onReport);
    onINP(this._onReport);
    onLCP(this._onReport);
    onTTFB(this._onReport);
  }

  init(): void {}
}
