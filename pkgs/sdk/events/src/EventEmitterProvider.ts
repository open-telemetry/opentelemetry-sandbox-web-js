import * as api from '@opentelemetry/api-events';
import { EventEmitter } from './EventEmitter';

export class EventEmitterProvider implements api.EventEmitterProvider {
    getEventEmitter(
        name: string,
        domain: string,
        version?: string | undefined,
        options?: api.EventEmitterOptions | undefined): api.EventEmitter
    {
        return new EventEmitter(name, version, domain);
    }
}
