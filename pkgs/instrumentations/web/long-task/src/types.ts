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
import type { Span } from '@opentelemetry/sandbox-api';
import type { InstrumentationConfig } from '@opentelemetry/sandbox-instrumentation';

// Currently missing in typescript DOM definitions
export interface PerformanceLongTaskTiming extends PerformanceEntry {
  attribution: TaskAttributionTiming[];
}

export interface TaskAttributionTiming extends PerformanceEntry {
  containerType: string;
  containerSrc: string;
  containerId: string;
  containerName: string;
}

export interface ObserverCallbackInformation {
  longtaskEntry: PerformanceLongTaskTiming;
}

export type ObserverCallback = (
  span: Span,
  information: ObserverCallbackInformation
) => void;

export interface LongtaskInstrumentationConfig extends InstrumentationConfig {
  /** Callback for adding custom attributes to span */
  observerCallback?: ObserverCallback;
}
