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

import { EventLoggerProvider } from './types/EventLoggerProvider';
import { EventLogger } from './types/EventLogger';
import { EventLoggerOptions } from './types/EventLoggerOptions';
import { NOOP_EVENT_LOGGER_PROVIDER } from './NoopEventLoggerProvider';
import { ProxyEventLogger } from './ProxyEventLogger';

/**
 * Event logger provider which provides {@link ProxyEventLogger}s.
 *
 * Before a delegate is set, event loggers provided are NoOp.
 *   When a delegate is set, event loggers are provided from the delegate.
 *   When a delegate is set after event loggers have already been provided,
 *   all event loggers already provided will use the provided delegate implementation.
 */
export class ProxyEventLoggerProvider implements EventLoggerProvider {
  private _delegate?: EventLoggerProvider;

  /**
   * Get a {@link EventLogger}
   */
  getEventLogger(name: string, version?: string | undefined, options?: EventLoggerOptions | undefined): EventLogger {
    return (
      this.getDelegateEventLogger(name, version, options) ??
      new ProxyEventLogger(this, name, version, options)
    );
  }

  forceFlush(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getDelegate(): EventLoggerProvider {
    return this._delegate ?? NOOP_EVENT_LOGGER_PROVIDER;
  }

  /**
   * Set the delegate event logger provider
   */
  setDelegate(delegate: EventLoggerProvider) {
    this._delegate = delegate;
  }

  getDelegateEventLogger(
    name: string,
    version?: string,
    options?: EventLoggerOptions
  ): EventLogger | undefined {
    return this._delegate?.getEventLogger(name, version, options);
  }
}
