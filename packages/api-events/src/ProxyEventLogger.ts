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

import { Event } from './types/Event';
import { EventLogger } from './types/EventLogger';
import { NoopEventLogger } from './NoopEventLogger';
import { EventLoggerOptions } from './types/EventLoggerOptions';

const NOOP_EVENT_LOGGER = new NoopEventLogger();

/**
 * Proxy tracer provided by the proxy tracer provider
 */
export class ProxyEventLogger implements EventLogger {
  // When a real implementation is provided, this will be it
  private _delegate?: EventLogger;

  constructor(
    private _provider: EventLoggerDelegator,
    public readonly name: string,
    public readonly version?: string,
    public readonly options?: EventLoggerOptions
  ) {}

  emit(event: Event): void {
    this._getEventLogger()?.emit(event);
  }

  /**
   * Try to get a event logger from the proxy event logger provider.
   * If the proxy event logger provider has no delegate, return a noop event logger.
   */
  private _getEventLogger() {
    if (this._delegate) {
      return this._delegate;
    }

    const eventLogger = this._provider.getDelegateEventLogger(
      this.name,
      this.version,
      this.options
    );

    if (!eventLogger) {
      return NOOP_EVENT_LOGGER;
    }

    this._delegate = eventLogger;
    return this._delegate;
  }
}

export interface EventLoggerDelegator {
  getDelegateEventLogger(
    name: string,
    version?: string,
    options?: EventLoggerOptions
  ): EventLogger| undefined;
}
