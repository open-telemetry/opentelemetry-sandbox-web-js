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

import { SimpleGit } from "simple-git";
import { doCleanup } from "./clean";
import { dumpObj } from "./utils";

/**
 * Terminate the script with the provided exit code
 * @param exitCode - The exit code to use
 */
export function terminate(exitCode: number): never {
    process.exit(exitCode);
}

/**
 * Terminate the script, logging the provided message to the console as an error and perform
 * any registered cleanup
 * @param git - The primary git instance to pass to the cleanup functions
 * @param message - The message to log as the error
 */
export async function fail(git: SimpleGit, message: string) {
    console.error(message);
    await doCleanup(git).catch(() => terminate(11));
    terminate(10);
}

/**
 * Create an abort function to pass as the error handler for a promise, using the provided
 * message as the error it thrown.
 * @param git - The primary git instance to pass to the cleanup functions
 * @param message - The message to use as the error
 * @returns A promise error handling function.
 */
export function abort(git: SimpleGit, message: string) {
    return async function (reason) {
        await fail(git, message + " - " + dumpObj(reason));
    }
}

