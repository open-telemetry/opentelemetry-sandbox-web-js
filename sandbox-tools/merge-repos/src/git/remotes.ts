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
import { IRepoDetails, IRepoSyncDetails } from "../support/types";
import { log } from "../support/utils";

/**
 * Regular expression to split the git remotes
 */
const remoteSplitRg = /^([^\s]*)\s*([^\s\(]*)\s*\(([^\)]*)\)$/;

/**
 * The remote URL details for fetch / push
 */
export interface RemoteDetails {
    fetch?: string;
    push?: string;
}

/**
 * An object definition that identifies the available remotes
 */
export declare type Remotes = { [name: string] : RemoteDetails };

/**
 * Remove all of the temporary remotes that exist on the git instance.
 * @param git - The SimpleGit instance for this repo
 * @param theRepos - The configured master repos (identifies the names used for the remotes)
 */
export async function removeTemporaryRemotes(git: SimpleGit, theRepos: IRepoSyncDetails, ) {
    let repoNames = Object.keys(theRepos);

    let remotes = await getRemoteList(git);

    // Remove any previous remotes
    let remoteNames = Object.keys(remotes);
    for (let lp = 0; lp < remoteNames.length; lp++) {
        let repoName = remoteNames[lp];
        if (remotes[repoName].fetch && repoNames.indexOf(repoName) !== -1) {
            log(`Removing previous remote ${repoName} - ${remotes[repoName].fetch}`);
            await git.removeRemote(repoName);
        }
    }
}

/**
 * Get the current configured remotes for the current git instance
 * @param git - The SimpleGit instance for this repo
 * @returns An object representing the available remotes
 */
export async function getRemoteList(git: SimpleGit): Promise<Remotes> {
    let details: Remotes = {};
    // Remove any previous remotes
    let remotes = (await git.remote(["-v"]) as string).split("\n");
    for (let lp = 0; lp < remotes.length; lp++) {
        let theRemote = remotes[lp];
        let match = remoteSplitRg.exec(theRemote);
        if (match && match.length === 4) {
            let repoName = match[1];
            let url = match[2];
            let type = match[3];

            let theRepo = details[repoName] = details[repoName] || {};
            if (type === "fetch") {
                theRepo.fetch = url;
            } else if (type === "push") {
                theRepo.push = url;
            }
        }
    }

    return details;
}

/**
 * Add the source origin repo that we are going to merge into this git instance as a remote and fetch the
 * current state of that repo
 * @param git - The SimpleGit instance to use for the local merge repo
 * @param name - The remote name to add the remote URL as
 * @param details - The details of the source repo that are being merged
 */
export async function addRemoteAndFetch(git: SimpleGit, name: string, details: IRepoDetails) {
    log(`Fetching ${name} - ${details.url}`);
    let branch = details.branch;
    if (branch) {
        await git.addRemote(name, details.url, ["-t", details.branch]);
    } else {
        await git.addRemote(name, details.url);
    }
    await git.fetch([name, "--tags", "--progress"]);
    log(`${name} remote fetched`);
}

/**
 * Remove the remote name from the git instance, this is the cleanup step of `addRemoteAndFetch()`
 * @param git - The SimpleGit instance to use for the local merge repo
 * @param name - The remote name to add the remote URL as
 */
export async function removeRemote(git: SimpleGit, name: string) {
    await git.removeRemote(name);
}

