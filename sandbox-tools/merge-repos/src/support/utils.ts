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

import * as fs from "fs";
import * as path from "path";

/**
 * Helper to dump (convert) an object (generally an error) for logging to the console
 * @param object - The object to be converted
 * @returns A string representation of the object.
 */
export function dumpObj(object: any): string {
    const objectTypeDump: string = Object.prototype.toString.call(object);
    let propertyValueDump: string = "";
    if (objectTypeDump === "[object Error]") {
        propertyValueDump = "{\n  name: '" + object.name + "',\n  message: '" + object.message + "',\n  stack: '" + object.stack + "'\n}";
    } else {
        propertyValueDump = JSON.stringify(object);
    }

    if (object.task) {
        propertyValueDump += "\n task details: " + JSON.stringify(object.task, null, 4);
    }

    return objectTypeDump + propertyValueDump;
}

/**
 * Log a message to the console
 * @param message 
 */
export function log(message: string) {
    console.log(message);
}

/**
 * Format a string with specific indent for trailing new lines or when the maxLength is exceeded
 * @param indent - The number of spaces to indent
 * @param value - The string value to be formatted
 * @param maxLength - An optional maximum length to format the value as
 * @returns A formatted string representation of the value
 */
export function formatIndentLines(indent: number, value: string, maxLength: number = -1) {
    let srcLines = value.split("\n");
    let lines: string[] = [];

    if (maxLength > 0) {
        let maxLen = maxLength;
        let lp = 0; 
        while (lp < srcLines.length) {
            let theLine = srcLines[lp].trim();
            if (theLine.length > maxLen) {
                // Line is too large, so lets try and split it
                let pos = maxLen;
    
                // Try and find the last space
                while (pos > 0 && theLine[pos] !== ' ') {
                    pos--;
                }
    
                if (pos === 0) {
                    pos = maxLen;
                }
                srcLines[lp] = theLine.substring(pos).trim();
                theLine = theLine.substring(0, pos);
                if (srcLines[lp].length > 0) {
                    lp--;
                }
            }
    
            // Add the new line
            lines.push(theLine);
    
            // Set future lengths
            maxLen = maxLength - indent;
            lp++;
        }
    } else {
        lines = srcLines;
    }

    let result = lines[0] || "";
    for (let lp = 1; lp < lines.length; lp++) {
        result += "\n".padEnd(indent + 1) + lines[lp]
    }

    return result;
}

/**
 * Helper to walk the CWD to "find" the git repo root, if not the current working
 * directory.
 * @returns A string with the resolved root, otherwise `null` if the root could not
 * be identified.
 */
export function findCurrentRepoRoot() {
    let depth = 10;
    let thePath = ".";

    do {
        if (fs.existsSync(thePath + "/.git")) {
            // Remove any current folder steps
            // return thePath.replace(/\.\.\/\.$/, "..");
            return path.resolve(thePath).replace(/\\/, "/");
        }

        thePath = "../" + thePath;
        depth--;
    } while (depth > 0);

    return null;
}

