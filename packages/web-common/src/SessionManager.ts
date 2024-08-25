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
import { SessionIdProvider } from "./types/SessionIdProvider";
import { SessionObserver } from "./types/SessionObserver";
import { SessionStorage } from "./types/SessionStorage";

export interface SessionManagerConfig {
  sessionIdGenerator: SessionIdGenerator;
  sessionStorage: SessionStorage;
  maxDuration?: number;
  idleTimeout?: number;
}

export class SessionManager implements SessionIdProvider {
  private _session: Session | null;
  private _idGenerator: SessionIdGenerator;
  private _storage: SessionStorage;
  private _observers: SessionObserver[];

  private _maxDuration?: number;
  private _maxDurationTimeoutId?: ReturnType<typeof setTimeout>;

  private _inactivityTimeout?: number;
  private _inactivityTimeoutId?: ReturnType<typeof setTimeout>;
  private _lastActivityTimestamp: number = 0;
  private _inactivityResetDelay: number = 5000; // minimum time between activities before timer is reset

  constructor(config: SessionManagerConfig) {
    this._idGenerator = config.sessionIdGenerator;
    this._storage = config.sessionStorage;
    this._maxDuration = config.maxDuration;
    this._inactivityTimeout = config.idleTimeout;

    this._observers = [];

    this._session = this._storage.get();
    if (!this._session) {
      this._session = this.startSession();
    }
    this.resetTimers();
  }

  addObserver(observer: SessionObserver): void {
    this._observers.push(observer);
  }

  getSessionId(): string | null {
    if (!this._session) {
      return null;
    }

    if (this._maxDuration && (Date.now() - this._session.startTimestamp) > this._maxDuration) {
      this.resetSession();
    }

    if (this._inactivityTimeout) {
      if (Date.now() - this._lastActivityTimestamp > this._inactivityResetDelay) {
        this.resetIdleTimer();
        this._lastActivityTimestamp = Date.now();
      }
    }

    return this._session.id;
  }

  getSession(): Session | null {
    return this._session;
  }

  private startSession(): Session {
    const sessionId = this._idGenerator.generateSessionId();

    const session: Session = {
      id: sessionId,
      startTimestamp: Date.now()
    }

    this._storage.save(session);
    this._session = session;

    for (let observer of this._observers) {
      observer.onSessionStarted(session);
    }

    return session;
  }

  private endSession(): void {
    if (!this._session) {
      return;
    }

    for (let observer of this._observers) {
      observer.onSessionEnded(this._session);
    }

    this._session = null;
    if (this._inactivityTimeoutId) {
      clearTimeout(this._inactivityTimeoutId);
      this._inactivityTimeoutId = undefined;
    }
  }

  private resetSession(): void {
    this.endSession();
    this.startSession();
    this.resetTimers();
  }

  private resetTimers() {
    if (this._inactivityTimeout) {
      this.resetIdleTimer();
    }
    if (this._maxDuration) {
      this.resetMaxDurationTimer();
    }
  }

  private resetIdleTimer() {
    if (this._inactivityTimeoutId) {
      clearTimeout(this._inactivityTimeoutId);
    }

    this._inactivityTimeoutId = setTimeout(() => {
      this.resetSession();
    }, this._inactivityTimeout);
  }

  private resetMaxDurationTimer() {
    if (!this._maxDuration || !this._session) {
      return
    }

    if (this._maxDurationTimeoutId) {
      clearTimeout(this._maxDurationTimeoutId);
    }
    
    const timeoutIn = this._maxDuration - (Date.now() - this._session?.startTimestamp);

    this._maxDurationTimeoutId = setTimeout(() => {
      this.resetSession();
    }, timeoutIn);
  }
}
