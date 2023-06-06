import { Attributes } from '@opentelemetry/sandbox-api';
import { Event } from '@opentelemetry/sandbox-api-events';
import { logs, LogRecord } from '@opentelemetry/sandbox-api-logs';

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
      scopeAttributes: scopeAttributes || undefined
    }
    this.logger = logs.getLogger(name, version, loggerOptions);
  }

  emit(event: Event) {
    const attributes = event.attributes || {};
    attributes['event.name'] = event.name;

    if (this.domain) {
      attributes['event.domain'] = this.domain;
    }

    if (event.data) {
      attributes['event.data'] = event.data;
    }

    const logRecord: LogRecord = {
      attributes: attributes
    };

    this.logger.emit(logRecord);
  }
}
