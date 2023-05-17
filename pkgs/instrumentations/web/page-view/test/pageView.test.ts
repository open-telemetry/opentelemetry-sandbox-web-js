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
  LoggerProvider,
  InMemoryLogRecordExporter,
  SimpleLogRecordProcessor,
  ReadableLogRecord,
} from '@opentelemetry/sandbox-sdk-logs';

import * as assert from 'assert';
import * as sinon from 'sinon';
import { PageViewEventInstrumentation } from '../src';
import { Attributes } from '@opentelemetry/sandbox-api';

describe('PageView Instrumentation', () => {
  let exporter: InMemoryLogRecordExporter;
  let provider: LoggerProvider;
  let logRecordProcessor: SimpleLogRecordProcessor;
  let plugin: PageViewEventInstrumentation;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    exporter = new InMemoryLogRecordExporter();
    provider = new LoggerProvider();
    logRecordProcessor = new SimpleLogRecordProcessor(exporter);
    provider.addLogRecordProcessor(logRecordProcessor);
  });

  afterEach(async () => {
    exporter.shutdown();
    sandbox.restore();
    plugin.disable();
  });

  describe('constructor', () => {
    it('should construct an instance', () => {
      plugin = new PageViewEventInstrumentation({
        enabled: false,
        loggerProvider: provider,
        applyCustomLogAttributes: logRecord => {},
      });

      assert.strictEqual(exporter.getFinishedLogRecords().length, 0);
      assert.ok(plugin instanceof PageViewEventInstrumentation);
    });
  });

  describe('export page_view LogRecord', () => {
    it("should export LogRecord for page_view event type 0 when 'DOMContentLoaded' event is fired", done => {
      plugin = new PageViewEventInstrumentation({
        enabled: false,
        loggerProvider: provider,
        applyCustomLogAttributes: logRecord => {},
      });

      const spy = sandbox.spy(document, 'addEventListener');
      plugin.enable();

      assert.ok(spy.calledOnce);

      document.dispatchEvent(new Event('DOMContentLoaded'));

      assert.strictEqual(exporter.getFinishedLogRecords().length, 1);

      const pageViewLogRecord =
        exporter.getFinishedLogRecords()[0] as ReadableLogRecord;
      assert.strictEqual(
        pageViewLogRecord.attributes['event.domain'],
        'browser'
      );
      assert.strictEqual(
        pageViewLogRecord.attributes['event.name'],
        'page_view'
      );
      assert.deepEqual(pageViewLogRecord.attributes['event.data'], {
        type: 0,
        url: document.documentURI as string,
        referrer: document.referrer,
        title: document.title,
      });
      done();
    });

    it('should export LogRecord for page_view event type 1 when history.pushState() is called', done => {
      const vpStartTime = 16842729000 * 1000000;
      const referrer = location.href;

      plugin = new PageViewEventInstrumentation({
        enabled: false,
        loggerProvider: provider,
        applyCustomLogAttributes: logRecord => {
          if (logRecord.attributes && logRecord.attributes['event.data']) {
            const eventDataAttr = <Attributes>(
              logRecord.attributes['event.data']
            );
            eventDataAttr['vp.startTime'] = vpStartTime;
          }
        },
      });

      history.pushState({}, '', '/dummy1.html');

      assert.strictEqual(exporter.getFinishedLogRecords().length, 1);

      const pageViewLogRecord =
        exporter.getFinishedLogRecords()[0] as ReadableLogRecord;
      assert.strictEqual(
        pageViewLogRecord.attributes['event.domain'],
        'browser'
      );
      assert.strictEqual(
        pageViewLogRecord.attributes['event.name'],
        'page_view'
      );

      assert.deepEqual(pageViewLogRecord.attributes['event.data'], {
        'http.url': document.documentURI as string,
        referrer: referrer,
        title: document.title,
        changeState: 'pushState',
        'vp.startTime': vpStartTime,
        type: 1,
      });
      done();
    });

    it('should export LogRecord for page_view event type 1 when history.replaceState() is called', done => {
      const vpStartTime = 16842729000 * 1000000;
      const referrer = location.href;

      plugin = new PageViewEventInstrumentation({
        enabled: false,
        loggerProvider: provider,
        applyCustomLogAttributes: logRecord => {
          if (logRecord.attributes && logRecord.attributes['event.data']) {
            const eventDataAttr = <Attributes>(
              logRecord.attributes['event.data']
            );
            eventDataAttr['vp.startTime'] = vpStartTime;
          }
        },
      });

      history.replaceState({}, '', '/dummy2.html');

      assert.strictEqual(exporter.getFinishedLogRecords().length, 1);

      const pageViewLogRecord =
        exporter.getFinishedLogRecords()[0] as ReadableLogRecord;
      assert.strictEqual(
        pageViewLogRecord.attributes['event.domain'],
        'browser'
      );
      assert.strictEqual(
        pageViewLogRecord.attributes['event.name'],
        'page_view'
      );

      assert.deepEqual(pageViewLogRecord.attributes['event.data'], {
        'http.url': document.documentURI as string,
        referrer: referrer,
        title: document.title,
        changeState: 'replaceState',
        'vp.startTime': vpStartTime,
        type: 1,
      });
      done();
    });

    it('should not export LogRecord for page_view event type 1 if the referrer is not changed.', done => {
      const vpStartTime = 16842729000 * 1000000;

      plugin = new PageViewEventInstrumentation({
        enabled: false,
        loggerProvider: provider,
        applyCustomLogAttributes: logRecord => {
          if (logRecord.attributes && logRecord.attributes['event.data']) {
            const eventDataAttr = <Attributes>(
              logRecord.attributes['event.data']
            );
            eventDataAttr['vp.startTime'] = vpStartTime;
          }
        },
      });

      const firstReferrer = location.href;
      history.pushState({}, '', '/dummy3.html');
      assert.strictEqual(exporter.getFinishedLogRecords().length, 1);

      const pageViewLogRecord =
        exporter.getFinishedLogRecords()[0] as ReadableLogRecord;
      assert.strictEqual(
        pageViewLogRecord.attributes['event.domain'],
        'browser'
      );
      assert.strictEqual(
        pageViewLogRecord.attributes['event.name'],
        'page_view'
      );

      assert.deepEqual(pageViewLogRecord.attributes['event.data'], {
        'http.url': document.documentURI as string,
        referrer: firstReferrer,
        title: document.title,
        changeState: 'pushState',
        'vp.startTime': vpStartTime,
        type: 1,
      });

      const secondReferrer = location.href;
      history.pushState({}, '', '/dummy3.html');
      assert.strictEqual(exporter.getFinishedLogRecords().length, 1);

      const pageViewLogRecord2 =
        exporter.getFinishedLogRecords()[0] as ReadableLogRecord;

      assert.strictEqual(
        pageViewLogRecord2.attributes['event.domain'],
        'browser'
      );
      assert.strictEqual(
        pageViewLogRecord2.attributes['event.name'],
        'page_view'
      );

      assert.deepEqual(pageViewLogRecord2.attributes['event.data'], {
        'http.url': document.documentURI as string,
        referrer: firstReferrer,
        title: document.title,
        changeState: 'pushState',
        'vp.startTime': vpStartTime,
        type: 1,
      });

      assert.notStrictEqual(
        (<Attributes>pageViewLogRecord2.attributes['event.data'])['referrer'],
        secondReferrer
      );

      done();
    });
  });
});
