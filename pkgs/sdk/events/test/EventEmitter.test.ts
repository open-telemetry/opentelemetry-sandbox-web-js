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
import { EventEmitter } from '../src';
import { Logger, logs } from '@opentelemetry/sandbox-api-logs';
import { TestLogger, TestLoggerProvider } from './utils';

function setupLoggerProvider(logger: Logger) {
  const provider = new TestLoggerProvider(logger);
  logs.setGlobalLoggerProvider(provider);
}

describe('EventEmitter', () => {
  describe('constructor', () => {
    it('should create an instance', () => {
      const emitter = new EventEmitter('test name', 'test version', 'test domain');
      assert.ok(emitter instanceof EventEmitter);
    });
  });

  describe('emit', () => {
    beforeEach(() => {
      // clear global LoggerProvider
      logs.disable();
    });

    it('should emit a logRecord instance', () => {
      const logger = new TestLogger();
      setupLoggerProvider(logger);
      const emitter = new EventEmitter('test-emitter', 'test-version');

      const spy = sinon.spy(logger, 'emit');
      emitter.emit({
        name: 'event name',
        data: {
          a: 1,
          b: 2
        },
        attributes: {
          c: 3,
          d: 4
        },
      });
      assert(spy.calledWith(sinon.match({
        attributes: {
          'event.name': 'event name',
          'event.data': {
            a: 1,
            b: 2
          },
          c: 3,
          d: 4
        }
      })));
    });

    it('adds event.domain attribute when provided', () => {
      const logger = new TestLogger();
      setupLoggerProvider(logger);
      const emitter = new EventEmitter('test-emitter', 'test-version', 'test domain');

      const spy = sinon.spy(logger, 'emit');
      emitter.emit({
        name: 'event name',
      });
      assert(spy.calledWith(sinon.match({
        attributes: {
          'event.name': 'event name'
        }
      })));
    });
  })
});
