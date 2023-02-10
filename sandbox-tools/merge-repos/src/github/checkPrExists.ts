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

import * as child_process from "child_process";
import * as util from "util";
import { SimpleGit} from "simple-git";
import { log, logError } from "../support/utils";
import path = require("path");

const execFile = util.promisify(child_process.execFile);

/**
 * Checks to see if a Pull Request already exists for the provided targetRepo and branch
 * @param git - The SimpleGit instance to use for this repo
 * @param gitRoot - The root of the repo
 * @param targetRepo - The repo to check for a PR
 * @param targetBranch - The branch on the repo to check for a PR
 * @returns 
 */
export async function checkPrExists(git: SimpleGit, gitRoot: string, targetRepo: string, targetBranch) {
    let prExists = false;
    let status = await git.status();
    let branchName = status.current;
    log(`Current Branch: ${branchName}`);

    let cwd = process.cwd();
    try {
        process.chdir(path.resolve(gitRoot));
        log(`Checking for existing PR for ${targetRepo} => ${targetBranch}`);
        await execFile("gh", [
            "pr",
            "list",
            "--state", "open",
            "--repo", targetRepo,
            "--base", targetBranch,
            "--author", "@me"
        ]).then(async (value) => {
            let lines = value.stdout.split("\n");
            if (lines.length > 0) {
                lines.forEach((line) => {
                    if (line && line.indexOf("[AutoMerge]") !== -1) {
                        prExists = true;
                        let tokens = line.split("\t");
                        log(` - #${tokens[0]} - ${tokens[1]}`);
                    }
                })
            }
        });
    } catch (e) {
        logError("Failed -- Have you installed the GitHub CLI tools https://cli.github.com/");
        throw e;
    } finally {
        process.chdir(cwd);
    }

    return prExists;
}
