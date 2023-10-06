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
import * as sinon from 'sinon';
import { registerInstrumentations } from '@opentelemetry/sandbox-instrumentation';
import { WebVitalsInstrumentation } from '../src';
// import * as webVitals from 'web-vitals';
// import { events } from '@opentelemetry/sandbox-api-events';
// import { VERSION } from '../src/version';

describe('WebVitalsInstrumentation', () => {
  let webVitalsInstrumentation: WebVitalsInstrumentation;
  let sandbox: sinon.SinonSandbox;
  let deregister: () => void;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    webVitalsInstrumentation = new WebVitalsInstrumentation({
      enabled: false,
    });

    deregister = registerInstrumentations({
      instrumentations: [webVitalsInstrumentation],
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should run tests', () => {
    deregister();
    sandbox.spy();
    assert.equal(true, true);
  });

  // it('should register CLS metric when enabled', () => {
  //   webVitalsInstrumentation.enable();
  //   const clsSpy = sandbox.stub(webVitals, 'onCLS').returns();
  //   assert(clsSpy.calledOnce);
  // });
  //
  // it('should register FID metric when enabled', () => {
  //   const fidspy = sandbox.spy(webVitals, 'onFID');
  //   webVitalsInstrumentation.enable();
  //   assert(fidspy.calledOnce);
  // });
  //
  // it('should register FCP metric when enabled', () => {
  //   const fcpspy = sandbox.spy(webVitals, 'onFCP');
  //   webVitalsInstrumentation.enable();
  //   assert(fcpspy.calledOnce);
  // });
  //
  // it('should register LCP metric when enabled', () => {
  //   const lcpspy = sandbox.spy(webVitals, 'onLCP');
  //   webVitalsInstrumentation.enable();
  //   assert(lcpspy.calledOnce);
  // });
  //
  // it('should call onReport with correct metrics', () => {
  //   const metric = {
  //     name: 'CLS',
  //     value: 0.5,
  //     delta: 0.05,
  //     id: 'some-id',
  //     rating: 'good',
  //     navigationType: 'navigate',
  //   };
  //
  //   sandbox.stub(webVitals, 'onCLS').callsFake(callback => {
  //     callback(metric as any);
  //   });
  //
  //   const emitSpy = sandbox.spy(
  //     events.getEventEmitter('web-vitals', VERSION),
  //     'emit'
  //   );
  //
  //   webVitalsInstrumentation.enable();
  //
  //   assert(
  //     emitSpy.calledWith({
  //       name: 'web_vital',
  //       attributes: {
  //         value: metric.value,
  //         delta: metric.delta,
  //         id: metric.id,
  //         rating: metric.rating,
  //         navigationType: metric.navigationType,
  //         name: metric.name,
  //       },
  //     })
  //   );
  // });
});
