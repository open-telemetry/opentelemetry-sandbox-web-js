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
import { Attributes } from '@opentelemetry/sandbox-api';
import { Event } from '@opentelemetry/sandbox-api-events';
import { logs, Logger, LogRecord } from '@opentelemetry/sandbox-api-logs';

export class EventEmitter {
  private logger: Logger;
  private domain: string | null;

  constructor(
    name: string,
    version?: string,
    domain?: string,
    schemaUrl?: string,
    scopeAttributes?: Attributes
  ) {
    this.domain = domain || null;
    const loggerOptions = {
      schemaUrl: schemaUrl || undefined,
      scopeAttributes: scopeAttributes || undefined,
    };
    this.logger = logs.getLogger(name, version, loggerOptions);
  }

  emit(event: Event) {
    const attributes = event.attributes || {};
    attributes['event.name'] = event.name;

    if (this.domain) {
      attributes['event.domain'] = this.domain;
    }

    const logRecord: LogRecord = {
      attributes: attributes,
    };

    this.logger.emit(logRecord);
  }
}
