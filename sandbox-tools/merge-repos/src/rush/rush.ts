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
import { SimpleGit } from "simple-git";

const execFile = util.promisify(child_process.execFile);

export interface IRushCommandLine {
    commandKind: string,
    summary: string,
    description?: string ,
    safeForSimultaneousRushProcesses?: boolean,
    enableParallelism: boolean,
    ignoreMissingScript?: boolean,
    allowWarningsInSuccessfulBuild?: boolean
};

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

export function rushUpdateCommandLine(gitRoot: string, rushCommands: { [name: string]: IRushCommandLine}): string {
    let result: string = null;

    process.chdir(path.resolve(gitRoot));

    log(`Updating command-line.json in ${path.resolve(gitRoot)}`);

    let commandLineLocation = "common/config/rush/command-line.json";
    let orgContent = "";
    let commandLinePath = path.resolve(gitRoot, commandLineLocation);
    if (fs.existsSync(commandLinePath)) {
        // Reading file vs using require(packagePath) as some package.json have a trailing "," which doesn't load via require()
        orgContent = removeTrailingComma(fs.readFileSync(commandLinePath, "utf-8"));
    }

    let commandLineJson = JSON.parse(orgContent);
    let theCommands = {};

    // Read the current commands
    commandLineJson.commands.forEach((theCommand) => {
        let props = {};
        let name: string;
        Object.keys(theCommand).forEach((key) => {
            if (key !== "name") {
                props[key] = theCommand[key];
            } else {
                name = theCommand[key];
            }
        });
        if (name) {
            theCommands[name] = props;
        }
    });

    // Merge in the new commands
    Object.keys(rushCommands).forEach((key) => {
        let rushCommand = rushCommands[key];
        let command = theCommands[key] = (theCommands[key] || {});
        Object.keys(rushCommand).forEach((cmdName) => {
            command[cmdName] = rushCommand[cmdName];
        });
    });

    commandLineJson.commands = [];
    Object.keys(theCommands).forEach((cmdName) => {
        let newCommand = {
            name: cmdName
        };
        Object.keys(theCommands[cmdName]).forEach((propName) => {
            newCommand[propName] = theCommands[cmdName][propName];
        });

        commandLineJson.commands.push(newCommand);
    });

    let newContent = JSON.stringify(commandLineJson, null, 4);

    if (orgContent !== newContent) {
        log(` -- ${commandLinePath} changed -- rewriting...`);
        fs.writeFileSync(commandLinePath, newContent);
        result = commandLineLocation;
    }

    return result;
}