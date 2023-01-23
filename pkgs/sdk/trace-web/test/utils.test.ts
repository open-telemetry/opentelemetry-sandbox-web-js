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
  hrTimeToNanoseconds,
  otperformance as performance,
} from '@opentelemetry/sandbox-core';
import * as core from '@opentelemetry/sandbox-core';
import * as tracing from '@opentelemetry/sandbox-sdk-trace-base';
import { HrTime } from '@opentelemetry/sandbox-api';

import * as assert from 'assert';
import * as sinon from 'sinon';
import {
  addSpanNetworkEvent,
  addSpanNetworkEvents,
  getResource,
  normalizeUrl,
  parseUrl,
  PerformanceEntries,
  shouldPropagateTraceHeaders,
  URLLike,
} from '../src';
import { PerformanceTimingNames as PTN } from '../src/enums/PerformanceTimingNames';

const SECOND_TO_NANOSECONDS = 1e9;

function createHrTime(startTime: HrTime, addToStart: number): HrTime {
  let seconds = startTime[0];
  let nanos = startTime[1] + addToStart;
  if (nanos >= SECOND_TO_NANOSECONDS) {
    nanos = SECOND_TO_NANOSECONDS - nanos;
    seconds++;
  }
  return [seconds, nanos];
}

function createResource(
  resource = {},
  startTime: HrTime,
  addToStart: number
): PerformanceResourceTiming {
  const fetchStart = core.hrTimeToNanoseconds(startTime) + 1;
  const responseEnd = fetchStart + addToStart;
  const million = 1000 * 1000; // used to convert nano to milli
  const defaultResource = {
    connectEnd: 0,
    connectStart: 0,
    decodedBodySize: 0,
    domainLookupEnd: 0,
    domainLookupStart: 0,
    encodedBodySize: 0,
    fetchStart: fetchStart / million,
    initiatorType: 'xmlhttprequest',
    nextHopProtocol: '',
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: 0,
    responseEnd: responseEnd / million,
    responseStart: 0,
    secureConnectionStart: 0,
    transferSize: 0,
    workerStart: 0,
    duration: 0,
    entryType: '',
    name: '',
    startTime: 0,
  };
  return Object.assign(
    {},
    defaultResource,
    resource
  ) as PerformanceResourceTiming;
}

describe('utils', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('addSpanNetworkEvents', () => {
    it('should add all network events to span', () => {
      const addEventSpy = sinon.spy();
      const setAttributeSpy = sinon.spy();
      const span = ({
        addEvent: addEventSpy,
        setAttribute: setAttributeSpy,
      } as unknown) as tracing.Span;
      const entries = {
        [PTN.FETCH_START]: 123,
        [PTN.DOMAIN_LOOKUP_START]: 123,
        [PTN.DOMAIN_LOOKUP_END]: 123,
        [PTN.CONNECT_START]: 123,
        [PTN.SECURE_CONNECTION_START]: 123,
        [PTN.CONNECT_END]: 123,
        [PTN.REQUEST_START]: 123,
        [PTN.RESPONSE_START]: 123,
        [PTN.RESPONSE_END]: 123,
        [PTN.DECODED_BODY_SIZE]: 123,
        [PTN.ENCODED_BODY_SIZE]: 61,
      } as PerformanceEntries;

      assert.strictEqual(addEventSpy.callCount, 0);

      addSpanNetworkEvents(span, entries);

      assert.strictEqual(addEventSpy.callCount, 9);
      assert.strictEqual(setAttributeSpy.callCount, 2);
    });
    it('should only include encoded size when content encoding is being used', () => {
      const addEventSpy = sinon.spy();
      const setAttributeSpy = sinon.spy();
      const span = ({
        addEvent: addEventSpy,
        setAttribute: setAttributeSpy,
      } as unknown) as tracing.Span;
      const entries = {
        [PTN.DECODED_BODY_SIZE]: 123,
        [PTN.ENCODED_BODY_SIZE]: 123,
      } as PerformanceEntries;

      assert.strictEqual(setAttributeSpy.callCount, 0);

      addSpanNetworkEvents(span, entries);

      assert.strictEqual(addEventSpy.callCount, 0);
      assert.strictEqual(setAttributeSpy.callCount, 1);
    });
  });
  describe('addSpanNetworkEvent', () => {
    [0, -2, 123].forEach(value => {
      describe(`when entry is ${value}`, () => {
        it('should add event to span', () => {
          const addEventSpy = sinon.spy();
          const span = ({
            addEvent: addEventSpy,
          } as unknown) as tracing.Span;
          const entries = {
            [PTN.FETCH_START]: value,
          } as PerformanceEntries;

          assert.strictEqual(addEventSpy.callCount, 0);

          addSpanNetworkEvent(span, PTN.FETCH_START, entries);

          assert.strictEqual(addEventSpy.callCount, 1);
          const args = addEventSpy.args[0];

          assert.strictEqual(args[0], 'fetchStart');
          assert.strictEqual(args[1], value);
        });
      });
    });
    describe('when entry is not numeric', () => {
      it('should NOT add event to span', () => {
        const addEventSpy = sinon.spy();
        const span = ({
          addEvent: addEventSpy,
        } as unknown) as tracing.Span;
        const entries = {
          [PTN.FETCH_START]: 'non-numeric',
        } as unknown;

        assert.strictEqual(addEventSpy.callCount, 0);

        addSpanNetworkEvent(
          span,
          PTN.FETCH_START,
          entries as PerformanceEntries
        );

        assert.strictEqual(addEventSpy.callCount, 0);
      });
    });
    describe('when entries does NOT contain the performance', () => {
      it('should NOT add event to span', () => {
        const addEventSpy = sinon.spy();
        const span = ({
          addEvent: addEventSpy,
        } as unknown) as tracing.Span;
        const entries = {
          [PTN.FETCH_START]: 123,
        } as PerformanceEntries;

        assert.strictEqual(addEventSpy.callCount, 0);

        addSpanNetworkEvent(span, 'foo', entries);

        assert.strictEqual(
          addEventSpy.callCount,
          0,
          'should not call addEvent'
        );
      });
    });
  });
  describe('getResource', () => {
    const startTime = [0, 123123123] as HrTime;
    beforeEach(() => {
      const time = createHrTime(startTime, 500);
      sinon.stub(performance, 'timeOrigin').value(0);
      sinon.stub(performance, 'now').callsFake(() => hrTimeToNanoseconds(time));
    });

    describe('when resources are empty', () => {
      it('should return undefined', () => {
        const spanStartTime = createHrTime(startTime, 1);
        const spanEndTime = createHrTime(startTime, 100);
        const spanUrl = 'http://foo.com/bar.json';
        const resources: PerformanceResourceTiming[] = [];

        const resource = getResource(
          spanUrl,
          spanStartTime,
          spanEndTime,
          resources
        );

        assert.deepStrictEqual(
          resource.mainRequest,
          undefined,
          'main request should be undefined'
        );
      });
    });

    describe('when resources has correct entry', () => {
      it('should return the closest one', () => {
        const spanStartTime = createHrTime(startTime, 1);
        const spanEndTime = createHrTime(startTime, 402);
        const spanUrl = 'http://foo.com/bar.json';
        const resources: PerformanceResourceTiming[] = [];

        // this one started earlier
        resources.push(
          createResource(
            {
              name: 'http://foo.com/bar.json',
            },
            createHrTime(startTime, -1),
            100
          )
        );

        // this one is correct
        resources.push(
          createResource(
            {
              name: 'http://foo.com/bar.json',
            },
            createHrTime(startTime, 1),
            400
          )
        );

        // this one finished after span
        resources.push(
          createResource(
            {
              name: 'http://foo.com/bar.json',
            },
            createHrTime(startTime, 1),
            1000
          )
        );

        const resource = getResource(
          spanUrl,
          spanStartTime,
          spanEndTime,
          resources
        );

        assert.deepStrictEqual(
          resource.mainRequest,
          resources[1],
          'main request should be defined'
        );
      });
      describe('But one resource has been already used', () => {
        it('should return the next closest', () => {
          const spanStartTime = createHrTime(startTime, 1);
          const spanEndTime = createHrTime(startTime, 402);
          const spanUrl = 'http://foo.com/bar.json';
          const resources: PerformanceResourceTiming[] = [];

          // this one started earlier
          resources.push(
            createResource(
              {
                name: 'http://foo.com/bar.json',
              },
              createHrTime(startTime, -1),
              100
            )
          );

          // this one is correct but ignored
          resources.push(
            createResource(
              {
                name: 'http://foo.com/bar.json',
              },
              createHrTime(startTime, 1),
              400
            )
          );

          // this one is also correct
          resources.push(
            createResource(
              {
                name: 'http://foo.com/bar.json',
              },
              createHrTime(startTime, 1),
              300
            )
          );

          // this one finished after span
          resources.push(
            createResource(
              {
                name: 'http://foo.com/bar.json',
              },
              createHrTime(startTime, 1),
              1000
            )
          );

          const ignoredResources = new WeakSet<PerformanceResourceTiming>();
          ignoredResources.add(resources[1]);
          const resource = getResource(
            spanUrl,
            spanStartTime,
            spanEndTime,
            resources,
            ignoredResources
          );

          assert.deepStrictEqual(
            resource.mainRequest,
            resources[2],
            'main request should be defined'
          );
        });
      });
    });

    describe('when there are multiple resources from CorsPreflight requests', () => {
      it('should return main request and cors preflight request', () => {
        const spanStartTime = createHrTime(startTime, 1);
        const spanEndTime = createHrTime(startTime, 182);
        const spanUrl = 'http://foo.com/bar.json';
        const resources: PerformanceResourceTiming[] = [];

        // this one started earlier
        resources.push(
          createResource(
            {
              name: 'http://foo.com/bar.json',
            },
            createHrTime(startTime, 1),
            10
          )
        );

        // this one is correct
        resources.push(
          createResource(
            {
              name: 'http://foo.com/bar.json',
            },
            createHrTime(startTime, 1),
            11
          )
        );

        // this one finished after span
        resources.push(
          createResource(
            {
              name: 'http://foo.com/bar.json',
            },
            createHrTime(startTime, 50),
            100
          )
        );

        // this one finished after span
        resources.push(
          createResource(
            {
              name: 'http://foo.com/bar.json',
            },
            createHrTime(startTime, 50),
            130
          )
        );

        const resource = getResource(
          spanUrl,
          spanStartTime,
          spanEndTime,
          resources,
          undefined
        );

        assert.deepStrictEqual(
          resource.corsPreFlightRequest,
          resources[0],
          'cors preflight request should be defined'
        );

        assert.deepStrictEqual(
          resource.mainRequest,
          resources[3],
          'main request should be defined'
        );
      });
    });
  });

  describe('shouldPropagateTraceHeaders', () => {
    it('should propagate trace when url is the same as origin', () => {
      const result = shouldPropagateTraceHeaders(
        `${globalThis.location.origin}/foo/bar`
      );
      assert.strictEqual(result, true);
    });
    it('should propagate trace when url match', () => {
      const result = shouldPropagateTraceHeaders(
        'http://foo.com',
        'http://foo.com'
      );
      assert.strictEqual(result, true);
    });
    it('should propagate trace when url match regexp', () => {
      const result = shouldPropagateTraceHeaders('http://foo.com', /foo.+/);
      assert.strictEqual(result, true);
    });
    it('should propagate trace when url match array of string', () => {
      const result = shouldPropagateTraceHeaders('http://foo.com', [
        'http://foo.com',
      ]);
      assert.strictEqual(result, true);
    });
    it('should propagate trace when url match array of regexp', () => {
      const result = shouldPropagateTraceHeaders('http://foo.com', [/foo.+/]);
      assert.strictEqual(result, true);
    });
    it("should NOT propagate trace when url doesn't match", () => {
      const result = shouldPropagateTraceHeaders('http://foo.com');
      assert.strictEqual(result, false);
    });
  });

  describe('parseUrl', () => {
    const urlFields: Array<keyof URLLike> = [
      'hash',
      'host',
      'hostname',
      'href',
      'origin',
      'password',
      'pathname',
      'port',
      'protocol',
      'search',
      'username',
    ];
    it('should parse url', () => {
      const url = parseUrl('https://opentelemetry.io/foo');
      urlFields.forEach(field => {
        assert.strictEqual(typeof url[field], 'string');
      });
    });

    it('should parse relative url', () => {
      const url = parseUrl('/foo');
      urlFields.forEach(field => {
        assert.strictEqual(typeof url[field], 'string');
      });
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize url', () => {
      const url = normalizeUrl('https://opentelemetry.io/你好');
      assert.strictEqual(url, 'https://opentelemetry.io/%E4%BD%A0%E5%A5%BD');
    });

    it('should normalize relative url', () => {
      const url = normalizeUrl('/你好');
      const urlObj = new URL(url);
      assert.strictEqual(urlObj.pathname, '/%E4%BD%A0%E5%A5%BD');
    });
  });
});
