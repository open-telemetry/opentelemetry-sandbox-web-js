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

import { ContextAPI } from '../api/context';
import { createContextKey } from '../context/context';
import { Context } from '../context/types';
import { Baggage } from './types';

/**
 * Baggage key
 */
const BAGGAGE_KEY = createContextKey('OpenTelemetry Baggage Key');

/**
 * Retrieve the current baggage from the given context
 *
 * @param {Context} Context that manage all context values
 * @returns {Baggage} Extracted baggage from the context
 */
export function getBaggage(context: Context): Baggage | undefined {
  return (context.getValue(BAGGAGE_KEY) as Baggage) || undefined;
}

/**
 * Retrieve the current baggage from the active/current context
 *
 * @returns {Baggage} Extracted baggage from the context
 */
export function getActiveBaggage(): Baggage | undefined {
  return getBaggage(ContextAPI.getInstance().active());
}

/**
 * Store a baggage in the given context
 *
 * @param {Context} Context that manage all context values
 * @param {Baggage} baggage that will be set in the actual context
 */
export function setBaggage(context: Context, baggage: Baggage): Context {
  return context.setValue(BAGGAGE_KEY, baggage);
}

/**
 * Delete the baggage stored in the given context
 *
 * @param {Context} Context that manage all context values
 */
export function deleteBaggage(context: Context): Context {
  return context.deleteValue(BAGGAGE_KEY);
}
