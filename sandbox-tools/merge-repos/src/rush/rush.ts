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
import * as child_process from "child_process";
import * as util from "util";
import { log, removeTrailingComma } from "../support/utils";
import path = require("path");

const execFile = util.promisify(child_process.execFile);

/**
 * Get a list of fork repositories, using the provided `gitRoot` as the current path
 * when executing the github `gh` CLI.
 * @param gitRoot - The path to use as the CWD
 * @returns The relative path to the shrinkwrap file if changed otherwise null
 */
export async function rushUpdateShrinkwrap(gitRoot: string): Promise<string> {
    let result: string = null;
    let cwd = process.cwd();
    try {
        process.chdir(path.resolve(gitRoot));

        let shrinkwrapLocation = "common/config/rush/npm-shrinkwrap.json";
        let orgShrinkWrapText = "";
        let shrinkwrapPath = path.resolve(gitRoot, shrinkwrapLocation);
        if (fs.existsSync(shrinkwrapPath)) {
            // Reading file vs using require(packagePath) as some package.json have a trailing "," which doesn't load via require()
            orgShrinkWrapText = removeTrailingComma(fs.readFileSync(shrinkwrapPath, "utf-8"));
        }
            
        log(`Updating npm-skrinkwrap.json in ${path.resolve(gitRoot)}`);
        await execFile("node", [
            "common/scripts/install-run-rush.js",
            "update",
            "--recheck",
            "--purge",
            "--full"
        ]).then(async (value) => {
            console.log(value.stdout);

            if (fs.existsSync(shrinkwrapPath)) {
                // Reading file vs using require(packagePath) as some package.json have a trailing "," which doesn't load via require()
                let newShrinkWrapText = removeTrailingComma(fs.readFileSync(shrinkwrapPath, "utf-8"));
                if (orgShrinkWrapText != newShrinkWrapText) {
                    result = shrinkwrapLocation;
                }
            }
    
        });
    } finally {
        process.chdir(cwd);
    }

    return result;
}

