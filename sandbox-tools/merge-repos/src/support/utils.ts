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
import { FileStatusResult } from "simple-git";

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
 * Log a warning message to the console
 * @param message 
 */
export function logWarn(message) {
    console.warn("!! - " + message);
}

/**
 * Log an error message to the console
 * @param message 
 */
 export function logError(message) {
    console.error("!! - " + message);
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

/**
 * Transforms any package name "@opentelemetry*" to "@opentelemetry-sandbox*"
 * @param text The content to process
 * @returns The transformed content
 */
export function transformPackages(text: string) {
    // Handles both "just" the package name "@opentelemetry/xxx" and an entire file (*.ts)
    // This works around the resources usage of a specific version and does not translate the name
    // - "@opentelemetry/resources_1.9.0": "npm:@opentelemetry/resources@1.9.0",
    // - import { Resource as Resource190 } from '@opentelemetry/resources_1.9.0';
    const pkgRegEx = /^@opentelemetry\/(?!sandbox-)([\w\-]*)$|(['"])@opentelemetry\/(?!sandbox-)([\w\-]*)['"]/g;
    let newContent = text.replace(pkgRegEx, function(_all, g1, g2, g3) {
        return (g2 || "") + "@opentelemetry/sandbox-" + (g1 || g3) + (g2 || "");
    });

    return newContent;
}

/**
 * Transform the provided text with all of the required transforms
 * @param text The content to process
 * @returns The transformed content
 */
export function transformContent(text: string) {
    let newContent = transformPackages(text);

    // Handles both "just" the package name "@opentelemetry/xxx" and an entire file (*.ts)
    // This works around the resources usage of a specific version and does not translate the name
    // - "@opentelemetry/resources_1.9.0": "npm:@opentelemetry/resources@1.9.0",
    // - import { Resource as Resource190 } from '@opentelemetry/resources_1.9.0';
    const pkgRegEx = /^@opentelemetry\/(?!sandbox-)([\w\-]*)(_[\w_\.]+)$|(['"])@opentelemetry\/(?!sandbox-)([\w\-]*)(_[\w_\.]+)['"]/g;
    newContent = newContent.replace(pkgRegEx, function(_all, g1, g2, g3, g4, g5) {
        return (g3 || "") + "@opentelemetry/" + (g1 || g4) + (g3 || "");
    });

    return newContent;
}

export function removeTrailingComma(text: string) {
    return text.replace(/,(\s*[}\],])/g, "$1");
}

export function logAppendMessage(gitRoot: string, commitMessage: string, fileStatus: FileStatusResult, message: string) {
    let logMessage: string;
    let thePath = fileStatus ? fileStatus.path : "";
    if (thePath.startsWith(gitRoot)) {
        thePath = thePath.substring(gitRoot.length);
    }

    if (fileStatus && thePath && fileStatus.index && fileStatus.working_dir) {
        logMessage = ` - (${fileStatus.index.padEnd(1)}${fileStatus.working_dir.padEnd(1)}) ${thePath} - ${message}`;
    } else if (fileStatus && thePath) {
        logMessage = ` - ${thePath} - ${message}`;
    } else {
        logMessage = ` - ${message}`;
    }

    log(logMessage);
    if (commitMessage.length + logMessage.length < 2048) {
        commitMessage += `\n${logMessage}`;
    } else if (commitMessage.indexOf("...truncated...") === -1) {
        commitMessage += "\n...truncated...";
    }

    return commitMessage;
}