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
import { SimpleGit} from "simple-git";
import { log, logError } from "../support/utils";
import path = require("path");

const execFile = util.promisify(child_process.execFile);

export interface Owner {
    id: string;
    login: string
}

export interface Parent {
    id: string;
    name: string;
    owner: Owner;
}
export interface GithubRepo {
    nameWithOwner: string;
    description: string;
    name: string;
    isFork: boolean;
    owner: Owner,
    parent: Parent
}

/**
 * Get a list of fork repositories, using the provided `gitRoot` as the current path
 * when executing the github `gh` CLI.
 * @param gitRoot - The path to use as the CWD
 * @returns An array of the github forks
 */
export async function gitHubListForkRepos(gitRoot: string): Promise<GithubRepo[]> {
    let repos: GithubRepo[] = [];
    let cwd = process.cwd();
    try {
        process.chdir(path.resolve(gitRoot));
        log("Listing existing fork repos...");
        await execFile("gh", [
            "repo",
            "list",
            "--fork",
            "--json", "nameWithOwner,description,isFork,parent,name,owner"
        ]).then(async (value) => {
            repos = JSON.parse(value.stdout);
        });
    } catch(e) {
        logError("Failed -- Have you installed the GitHub CLI tools https://cli.github.com/");
        throw e;
    } finally {
        process.chdir(cwd);
    }

    return repos
}

export async function gitHubCreateForkRepo(gitRoot: string, repoToFork: string) {
    let repos = await gitHubListForkRepos(gitRoot);
    let hasRepo = false;
    repos.forEach((repo) => {
        if (repo.nameWithOwner === repoToFork) {
            hasRepo = true;
        }
    });

    if (!hasRepo) {
        let cwd = process.cwd();
        try {
            process.chdir(path.resolve(gitRoot));

            log(`Creating fork repo of ${repoToFork}...`);
            await execFile("gh", [
                "repo",
                "fork",
                repoToFork,
                "--clone=false"
            ]);
        } finally {
            process.chdir(cwd);
        }
    } else {
        log(`Fork for repo ${repoToFork} already exists...`);
    }
}

export async function createPullRequest(git: SimpleGit, gitRoot: string, title: string, body: string, targetRepo: string, targetBranch, test: boolean) {
    let status = await git.status();
    let branchName = status.current;
    let tempBodyFile: string;

    let cwd = process.cwd();
    try {
        process.chdir(path.resolve(gitRoot));

        log(`Creating Pull Request for ${branchName}`);

        let prArgs = [
            "pr",
            "create",
            "--title", title,
            "--repo", targetRepo,
            "--base", targetBranch
        ];

        if (test) {
            prArgs.push("--draft");
            prArgs.push("--label");
            prArgs.push("do-not-merge");
        }

        if (body) {
            if (body.length > 256) {
                tempBodyFile = process.cwd() + "/.prBody.txt";
                fs.writeFileSync(tempBodyFile, body);
                prArgs.push("--body-file", tempBodyFile);
            } else {
                prArgs.push("--body", body);
            }
        } else {
            prArgs.push("--fill");
        }

        await execFile("gh", prArgs);
    } finally {
        if (tempBodyFile) {
            fs.unlinkSync(tempBodyFile);
        }

        process.chdir(cwd);
    }
}
