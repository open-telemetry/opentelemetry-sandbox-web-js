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

import { SessionIdGenerator } from "./types/SessionIdGenerator";
import { Session } from "./types/Session";
import { SessionProvider } from "./types/SessionProvider";
import { SessionObserver } from "./types/SessionObserver";
import { SessionStorage } from "./types/SessionStorage";
import { SessionPublisher } from "./types/SessionPublisher";
import { SessionLifecycle } from "./types/SessionLifecycle";

export interface SessionManagerConfig {
  sessionIdGenerator: SessionIdGenerator;
  sessionStorage: SessionStorage;
  sessionLifecycle: SessionLifecycle
}

export class SessionManager implements SessionProvider, SessionPublisher {
  private _session: Session | null | undefined;
  private _idGenerator: SessionIdGenerator;
  private _storage: SessionStorage;
  private _observers: SessionObserver[];
  private _lifecycle: SessionLifecycle;

  constructor(config: SessionManagerConfig) {
    this._idGenerator = config.sessionIdGenerator;
    this._storage = config.sessionStorage;
    this._observers = [];

    this._lifecycle =  config.sessionLifecycle;
    this._lifecycle.onSessionEnded(() => {
      this.resetSession();
    });

    this._session = this._storage.get();
    if (!this._session) {
      this._session = this.startSession();
    }
    this._lifecycle.start(this._session);
  }

  addObserver(observer: SessionObserver): void {
    this._observers.push(observer);
  }

  getSessionId(): string | null {
    if (!this._session) {
      return null;
    }

    this._lifecycle.bumpSessionActive();

    return this._session.id;
  }

  getSession(): Session | null | undefined {
    return this._session;
  }

  private startSession(): Session {
    const sessionId = this._idGenerator.generateSessionId();

    const session: Session = {
      id: sessionId,
      startTimestamp: Date.now()
    }

    this._storage.save(session);
    
    for (let observer of this._observers) {
      observer.onSessionStarted(session, this._session ?? undefined);
    }

    this._session = session;

    return session;
  }

  private endSession(): void {
    if (!this._session) {
      return;
    }

    for (let observer of this._observers) {
      observer.onSessionEnded(this._session);
    }

    this._session = undefined;
    this._lifecycle.clear();
  }

  private resetSession(): void {
    this.endSession();
    this.startSession();
    this._lifecycle.start(this._session!);
  }
}
