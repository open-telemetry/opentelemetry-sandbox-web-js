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
import { PageViewInstrumentationConfig } from './types';
/**
 * This class represents a document load plugin
 */

export class PageViewEventInstrumentation extends InstrumentationBase<unknown> {
  static readonly instrumentationName =
    '@opentelemetry/instrumentation-page-view';
  readonly component: string = 'page-view-event';
  readonly version: string = '1';
  moduleName = this.component;
  logger?: Logger;
  referrer?: string;

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

    this._wrapHistory();
    this.referrer = config.referrer ?? '';
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
    this.logger?.emit(pageViewEvent);
  }

  /**
   * callback to be executed when page is viewed
   */
  private _onVirtualPageView(changeState: string | null | undefined) {
    const vPageViewEvent: LogRecord = {
      attributes: {
        'event.domain': 'browser',
        'event.name': 'page_view',
        'event.data': {
          'http.url': window.location.href,
          title: document.title,
          changeSate: changeState || '',
          referrer: this.referrer,
          'vp.startTime': Date.now() * 1000000,
          type: 1,
        },
      },
    };
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
    };

    history.replaceState = (
      data: any,
      title: string,
      url?: string | null | undefined
    ) => {
      originalReplaceState.apply(history, [data, title, url]);
      this._onVirtualPageView('replaceState');
    };
  }
}
