
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

import { Session } from "./Session";

export interface SessionLifecycle {
  /** Starts tracking a new session */
  start(session: Session): void;

  /** Stop tracking the current session, reset to a clear state */
  clear(): void;

  /** Notifies this class that the session is currently active. */
  bumpSessionActive(): void;

  /** Register a listener function to call when session is ended. */
  onSessionEnded(listener: () => void): void;
}
