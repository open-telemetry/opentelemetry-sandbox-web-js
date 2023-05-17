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

import { Logger, LogRecord } from '@opentelemetry/sandbox-api-logs';

import { VERSION } from './version';
import {
  ApplyCustomLogAttributesFunction,
  PageViewInstrumentationConfig,
} from './types';
/**
 * This class represents a document load plugin
 */

export class PageViewEventInstrumentation extends InstrumentationBase<unknown> {
  static readonly instrumentationName =
    '@opentelemetry/instrumentation-page-view';
  readonly component: string = 'page-view-event';
  readonly version: string = '1';
  moduleName = this.component;
  logger: Logger | null = null;
  oldUrl = location.href;
  applyCustomLogAttributes: ApplyCustomLogAttributesFunction | undefined =
    undefined;

  /**
   *
   * @param config
   */
  constructor(config: PageViewInstrumentationConfig) {
    super(PageViewEventInstrumentation.instrumentationName, VERSION, config);
    this.logger = config.loggerProvider.getLogger(
      PageViewEventInstrumentation.instrumentationName,
      VERSION
    );
    this.applyCustomLogAttributes = config.applyCustomLogAttributes;
    this._wrapHistory();
  }

  init() {}

  /**
   * callback to be executed when page is viewed
   */
  private _onPageView() {
    const pageViewEvent: LogRecord = {
      attributes: {
        'event.domain': 'browser',
        'event.name': 'page_view',
        'event.data': {
          url: document.documentURI as string,
          referrer: document.referrer,
          title: document.title,
          type: 0,
        },
      },
    };
    this._applyCustomAttributes(pageViewEvent, this.applyCustomLogAttributes);
    this.logger?.emit(pageViewEvent);
  }

  /**
   * callback to be executed when page is viewed
   */
  private _onVirtualPageView(changeState: string | null | undefined) {
    const title = document.title;
    const referrer = this.oldUrl;
    // Dont emit an event if the route didn't change
    if (referrer === location.href) {
      return;
    }
    const vPageViewEvent: LogRecord = {
      attributes: {
        'event.domain': 'browser',
        'event.name': 'page_view',
        'event.data': {
          'http.url': window.location.href,
          title,
          changeState: changeState || '',
          referrer,
          type: 1,
        },
      },
    };
    this._applyCustomAttributes(vPageViewEvent, this.applyCustomLogAttributes);
    this.logger?.emit(vPageViewEvent);
  }

  public _setLogger(logger: Logger) {
    this.logger = logger;
  }

  /**
   * executes callback {_onDocumenContentLoaded } when the page is viewed
   */
  private _waitForPageLoad() {
    document.addEventListener('DOMContentLoaded', this._onPageView.bind(this));
  }

  /**
   * implements enable function
   */
  override enable() {
    // remove previously attached load to avoid adding the same event twice
    // in case of multiple enable calling.
    document.removeEventListener(
      'DOMContentLoaded',
      this._onPageView.bind(this)
    );
    this._waitForPageLoad();
  }

  /**
   * implements disable function
   */
  override disable() {
    document.removeEventListener(
      'DOMContentLoaded',
      this._onPageView.bind(this)
    );
  }

  private _wrapHistory(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (
      data: any,
      title: string,
      url?: string | null | undefined
    ) => {
      originalPushState.apply(history, [data, title, url]);
      this._onVirtualPageView('pushState');
      this.oldUrl = location.href;
    };

    history.replaceState = (
      data: any,
      title: string,
      url?: string | null | undefined
    ) => {
      originalReplaceState.apply(history, [data, title, url]);
      this._onVirtualPageView('replaceState');
      this.oldUrl = location.href;
    };
  }

  _applyCustomAttributes(
    logRecord: LogRecord,
    applyCustomLogAttributes: ApplyCustomLogAttributesFunction | undefined
  ) {
    if (applyCustomLogAttributes) {
      applyCustomLogAttributes(logRecord);
    }
  }
}
