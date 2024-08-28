
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

import { Session } from "./types/Session";
import { SessionLifecycle } from "./types/SessionLifecycle";

export class DefaultSessionLifecycle implements SessionLifecycle {
  private _maxDuration?: number;
  private _maxDurationTimeoutId?: ReturnType<typeof setTimeout>;
  private _inactivityTimeout?: number;
  private _inactivityTimeoutId?: ReturnType<typeof setTimeout>;
  private _lastActivityTimestamp: number = 0;
  private _inactivityResetDelay: number = 5000; // minimum time between activities before timer is reset
  private _timeoutListener: (() => void) | undefined;
  private _session: Session | undefined;

  constructor(maxDuration?: number, inactivityTimeout?: number) {
    this._maxDuration = maxDuration;
    this._inactivityTimeout = inactivityTimeout;
  }
  
  onSessionEnded(listener: () => void): void {
    this._timeoutListener = listener;
  }

  public start(session: Session) {
    this._session = session;
    this.resetTimers();
  }

  public clear() {
    if (this._inactivityTimeoutId) {
      clearTimeout(this._inactivityTimeoutId);
      this._inactivityTimeoutId = undefined;
    }

    if (this._maxDurationTimeoutId) {
      clearTimeout(this._maxDurationTimeoutId);
      this._maxDurationTimeoutId = undefined;
    }

    this._session = undefined;
  }

  public bumpSessionActive() {
    if (!this._session) {
      return;
    }

    if (this._maxDuration && (Date.now() - this._session.startTimestamp) > this._maxDuration) {
      this.notifySessionEnded();
    }

    if (this._inactivityTimeout) {
      if (Date.now() - this._lastActivityTimestamp > this._inactivityResetDelay) {
        this.resetIdleTimer();
        this._lastActivityTimestamp = Date.now();
      }
    }
  }

  private notifySessionEnded() {
    if (this._timeoutListener) {
      this._timeoutListener();
    }
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
      this.notifySessionEnded();
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
      this.notifySessionEnded();
    }, timeoutIn);
  }
}
