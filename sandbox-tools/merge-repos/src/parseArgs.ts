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

/**
 * Simple base interface used to provide common "switch" values
 */
export interface SwitchBase {
    /**
     * Was the show help requested
     */
    showHelp?: boolean;
}

/**
 * Generic interface to define how the command line should be parsed.
 */
export interface SwitchOptions<T extends SwitchBase> {
    /**
     * The minimum number of expected arguments (anything less will cause a parse failure)
     */
    minArgs?: number;

    /**
     * The minimum number of non-switch values that are expected, anything less will cause
     * a parse failure.
     */
    minValues?: number;

    /**
     * The maximum number of non-switch values that can be provided, anything more will cause
     * a parse failure.
     */
    maxValues?: number;

    /**
     * The expected (available) switches (prefixed with "-" or "/") that can be provided
     * and whether the trailing value (true) should be considered it's value, or (false)
     * whether this is just a simple "presence" switch.
     */
    switches?: { [key in keyof T]: boolean };

    /**
     * Default values and switches to be used and overwritten by any provided command
     * line arguments.
     */
    defaults?: {
        values?: string[];
        switches?: T
    }
}

/**
 * An interface that defines the result of parsing the command line.
 */
export interface ParsedOptions<T extends SwitchBase> {
    /**
     * The name of the script being executed
     */
    name?: string;

    /**
     * Was there an error parsing the command line
     */
    failed?: boolean;

    /**
     * The errors that occurred while parsing the command line
     */
    errors?: string[];

    /**
     * The resulting values from parsing the command line
     */
    values: string[];

    /**
     * The switches and values from parsing the command line.
     */
    switches: T
}

/**
 * Internal helper to add an error to the parsed Options to be returned
 * @param options 
 * @param message 
 */
function _addError<T extends SwitchBase>(options: ParsedOptions<T>, message: string) {
    options.failed = true;
    options.errors.push(message);
}

/**
 * Parse the Node.JS command line arguments
 * @param options - Identifies the expected values and defaults
 * @returns A ParsedOptions object that represents the result of parsing the command line
 */
export function parseArgs<T extends SwitchBase>(options: SwitchOptions<T>) {
    let parsed: ParsedOptions<T> = {
        name: process.argv[1],
        failed: false,
        errors: [],
        values: (options.defaults || {}).values || [],
        switches: (options.defaults || {}).switches || {} as T
    };

    if (options.minArgs === undefined) {
        options.minArgs = 0;
    }

    if (options.minValues === undefined) {
        options.minValues = 0;
    }

    if (options.maxValues === undefined) {
        options.maxValues = 0;
    }

    if (process.argv.length < (2 + options.minArgs)) {
        _addError(parsed, "!!! Invalid number of arguments -- " + process.argv.length);
        return parsed;
    }

    let pos = 0;
    let idx = 2;
    while(idx < process.argv.length) {
        let theArg = process.argv[idx];
        if (theArg.startsWith("-") || theArg.startsWith("/")) {
            let switchArg = theArg.substring(1);
            if (switchArg === "?" || switchArg === "help") {
                parsed.switches.showHelp = true;
                return parsed;
            } else if (options.switches && options.switches[switchArg] !== undefined) {
                if (options.switches[switchArg]) {
                    if ((idx + 1) < process.argv.length) {
                        parsed.switches[switchArg] = process.argv[idx + 1];
                        idx++;
                    } else {
                        _addError(parsed, `Missing argument after switch -${switchArg}`);
                        break;
                    }
                } else {
                    parsed.switches[switchArg] = true;
                }
            } else {
                _addError(parsed, "Unknown switch [" + theArg + "]");
                break;
            }
        } else {
            if (options.maxValues === undefined || parsed.values.length < options.maxValues) {
                if (pos < parsed.values.length) {
                    parsed.values.push(theArg);
                } else {
                    parsed.values[pos] = theArg;
                }
            } else {
                _addError(parsed, "Unrecognized or too many arguments [" + theArg + "]");
                break;
            }

            pos++;
        }

        idx ++;
    }

    if (!parsed.failed && options.minValues > 0 && parsed.values.length < options.minValues) {
        _addError(parsed, `Wrong number of arguments, expected at least ${options.minValues}`);
    }

    return parsed;
}

