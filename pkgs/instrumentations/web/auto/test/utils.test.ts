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

import { diag } from '@opentelemetry/sandbox-api';
import { XMLHttpRequestInstrumentationConfig } from '@opentelemetry/sandbox-instrumentation-xml-http-request';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { getWebAutoInstrumentations } from '../src';

describe('utils', () => {
  describe('getWebAutoInstrumentations', () => {
    it('should load default instrumentations', () => {
      const instrumentations = getWebAutoInstrumentations();
      const expectedInstrumentations = [
        '@opentelemetry/sandbox-instrumentation-document-load',
        '@opentelemetry/sandbox-instrumentation-fetch',
        '@opentelemetry/sandbox-instrumentation-user-interaction',
        '@opentelemetry/sandbox-instrumentation-xml-http-request',
      ];
      assert.strictEqual(instrumentations.length, 4);
      for (let i = 0, j = instrumentations.length; i < j; i++) {
        assert.strictEqual(
          instrumentations[i].instrumentationName,
          expectedInstrumentations[i],
          `Instrumentation ${expectedInstrumentations[i]}, not loaded`
        );
      }
    });

    it('should use user config', () => {
      const clearTimingResources = true;

      const instrumentations = getWebAutoInstrumentations({
        '@opentelemetry/sandbox-instrumentation-xml-http-request': {
          clearTimingResources,
        },
      });
      const instrumentation = instrumentations.find(
        instr =>
          instr.instrumentationName ===
          '@opentelemetry/sandbox-instrumentation-xml-http-request'
      ) as any;
      const config =
        instrumentation._config as XMLHttpRequestInstrumentationConfig;

      assert.strictEqual(config.clearTimingResources, clearTimingResources);
    });

    it('should not return disabled instrumentation', () => {
      const instrumentations = getWebAutoInstrumentations({
        '@opentelemetry/sandbox-instrumentation-xml-http-request': {
          enabled: false,
        },
      });
      const instrumentation = instrumentations.find(
        instr =>
          instr.instrumentationName ===
          '@opentelemetry/sandbox-instrumentation-xml-http-request'
      );
      assert.strictEqual(instrumentation, undefined);
    });

    it('should show error for none existing instrumentation', () => {
      const spy = sinon.stub(diag, 'error');
      const name = '@opentelemetry/sandbox-instrumentation-http2';
      const instrumentations = getWebAutoInstrumentations({
        // @ts-expect-error verify that wrong name works
        [name]: {
          enabled: false,
        },
      });
      const instrumentation = instrumentations.find(
        instr => instr.instrumentationName === name
      );
      assert.strictEqual(instrumentation, undefined);

      assert.strictEqual(
        spy.args[0][0],
        `Provided instrumentation name "${name}" not found`
      );
    });
  });
});
