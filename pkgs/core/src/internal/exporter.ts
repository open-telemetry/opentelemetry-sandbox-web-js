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

import { context } from '@opentelemetry/sandbox-api';
import { ExportResult } from '../ExportResult';
import { suppressTracing } from '../trace/suppress-tracing';

export interface Exporter<T> {
  export(arg: T, resultCallback: (result: ExportResult) => void): void;
}

/**
 * @internal
 * Shared functionality used by Exporters while exporting data, including suppression of Traces.
 */
export function _export<T>(
  exporter: Exporter<T>,
  arg: T
): Promise<ExportResult> {
  return new Promise(resolve => {
    // prevent downstream exporter calls from generating spans
    context.with(suppressTracing(context.active()), () => {
      exporter.export(arg, (result: ExportResult) => {
        resolve(result);
      });
    });
  });
}
