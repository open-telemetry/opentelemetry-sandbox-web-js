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
import * as assert from 'assert';
import * as api from '@opentelemetry/sandbox-api';
import { AlwaysOffSampler } from '../../../src/sampler/AlwaysOffSampler';

describe('AlwaysOffSampler', () => {
  it('should reflect sampler name', () => {
    const sampler = new AlwaysOffSampler();
    assert.strictEqual(sampler.toString(), 'AlwaysOffSampler');
  });

  it('should return decision: api.SamplingDecision.NOT_RECORD for AlwaysOffSampler', () => {
    const sampler = new AlwaysOffSampler();
    assert.deepStrictEqual(sampler.shouldSample(), {
      decision: api.SamplingDecision.NOT_RECORD,
    });
  });
});
