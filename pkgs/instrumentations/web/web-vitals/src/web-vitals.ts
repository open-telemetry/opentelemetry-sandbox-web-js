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

import { InstrumentationBase } from '@opentelemetry/sandbox-instrumentation';
import { Event, EventEmitter, events } from '@opentelemetry/sandbox-api-events';
import { ReportOpts, Metric } from 'web-vitals';
import * as webVitals from 'web-vitals';
import { VERSION } from './version';

import {
  WebVitalsInstrumentationConfig,
  ApplyCustomEventDataFunction,
} from './types';

const DEFAULT_METRIC_NAMES: Metric['name'][] = ['CLS', 'FID', 'LCP'];

export class WebVitalsInstrumentation extends InstrumentationBase {
  applyCustomEventData: ApplyCustomEventDataFunction | undefined = undefined;
  emitter: EventEmitter | null = null;
  private _metricsToTrack: Metric['name'][];
  private _reportAllChanges: ReportOpts['reportAllChanges'];
  private _durationThreshold: ReportOpts['durationThreshold'];

  constructor(config?: WebVitalsInstrumentationConfig) {
    super('@opentelemetry/sandbox-instrumentation-web-vitals', VERSION, config);
    this._metricsToTrack = config?.metricsToTrack || DEFAULT_METRIC_NAMES;
    this._reportAllChanges = config?.reportAllChanges;
    this._durationThreshold = config?.durationThreshold;
    this.applyCustomEventData = config?.applyCustomEventData;
    this.emitter = events.getEventEmitter('web-vitals', VERSION, 'browser');
    if (config?.enabled !== false) {
      this.enable();
    }
  }

  private _onReport = (metric: Metric) => {
    const webVitalEvent = {
      name: 'web_vital',
      data: {
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        rating: metric.rating,
        navigationType: metric.navigationType,
        name: metric.name,
      },
    };
    if (this.applyCustomEventData) {
      this._applyCustomEventData(webVitalEvent, this.applyCustomEventData);
    }
    this.emitter?.emit(webVitalEvent);
  };
  override disable() {
    this._metricsToTrack.forEach(metric => {
      webVitals[`on${metric}`](() => {});
    });
  }

  override enable() {
    if (this._metricsToTrack) {
      this._metricsToTrack.forEach(metric => {
        webVitals[`on${metric}`](this._onReport, {
          reportAllChanges: this._reportAllChanges,
          durationThreshold: this._durationThreshold,
        });
      });
    }
  }

  init(): void {}
  /**
   *
   * @param event
   * @param applyCustomEventData
   * Add custom data to the event
   */
  _applyCustomEventData(
    event: Event,
    applyCustomEventData: ApplyCustomEventDataFunction | undefined
  ) {
    if (applyCustomEventData) {
      applyCustomEventData(event);
    }
  }
}
