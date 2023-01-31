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
import { ResetMode, SimpleGit } from "simple-git";
import { abort, fail } from "../support/abort";
import { createGit } from "./createGit";
import { addRemoteAndFetch, getRemoteList } from "./remotes";
import { setUser, UserDetails } from "./userDetails";
import { log } from "../support/utils";
import { IRepoDetails } from "../support/types";

/**
 * Create a new local git instance in the `forkDest` folder
 * @param git - The master default git SimpleGit instance
 * @param forkDest - The folder to create the new got clone instance of the originRepo
 * @param originRepo - The originRepo in the form <owner>/<reponame>
 * @param originBranch - The origin branch to use as the source branch for the local clone
 * @param workingLocalBranch - The working local branch name to use
 * @returns A new SimpleGit instance for working with the new local cloned origin repo in the forkDest
 */
export async function createLocalBranch(git: SimpleGit, forkDest: string, originRepo: string, originBranch: string, destUser: string, repoName: string, workingLocalBranch: string, userDetails: UserDetails): Promise<SimpleGit> {

    if (fs.existsSync(forkDest)) {
        log(`Removing previous working dest ${forkDest}`);
        fs.rmSync(forkDest, { recursive: true });
        if (fs.existsSync(forkDest)) {
            await fail(null, `Failed to remove previous ${forkDest}`)
        }
    }

    const destRepo = destUser + "/" + repoName;
    let destRepoUrl =  "https://github.com/" + destRepo;
    let gitHubToken = process.env["GITHUB_TOKEN"];
    if (gitHubToken) {
        destRepoUrl = "https://" + gitHubToken + "@github.com/" + destRepo;
    }

    const originRepoUrl = "https://github.com/" + originRepo;

    if (destRepo === originRepo && originBranch === workingLocalBranch) {
        fail(git, `Unable to continue: The destination repo ${destRepo} and branch ${workingLocalBranch} for the current user ${userDetails.name}\n` +
                `cannot be the same as the origin repo ${originRepo} and branch ${originBranch}.\n` +
                `You MUST set and provide the destination user credentials in the github action before calling this script`);
    }

    log(`Cloning the source repo ${originRepo} branch ${originBranch} to ${forkDest}`);
    await git.clone(originRepoUrl, forkDest, [ "-b", originBranch]);

    // Create a new SimpleGit instance for the clone destination
    let mergeGit = createGit(forkDest, "merge.git");

    await setUser(mergeGit, userDetails);

    // Switch around the remotes so that the destination repo is the origin
    let cloneRemotes = await getRemoteList(mergeGit);

    log(`Setting origin repo as ${destRepo}`);
    if (cloneRemotes.origin) {
        await mergeGit.removeRemote("origin");
    }

    // Add the origin remote and fetch so we get all available branches
    await addRemoteAndFetch(mergeGit, "origin", { url: destRepoUrl, branch: null });

    log(`Setting upstream repo to ${originRepo}`);
    if (cloneRemotes.upstream) {
        await mergeGit.removeRemote("upstream");
    }
    await addRemoteAndFetch(mergeGit, "upstream", { url: originRepoUrl, branch: originBranch });

    // Rebase the origin branch to match the upstream branch
    await mergeGit.reset(ResetMode.HARD, [ "upstream/" + originBranch ]);
    await mergeGit.push("origin", originBranch, [ "-f" ]);

    log(`Creating new local branch ${workingLocalBranch} from origin/${originBranch}`);
    await mergeGit.checkout([
        "-b", workingLocalBranch,
        "origin/" + originBranch
    ]);
    
    // rebase to upstream to avoid merge conflicts for the final PR
    await mergeGit.reset(ResetMode.HARD, [ "upstream/" + originBranch ]);
    // If there is an open PR on the origin branch this causes the PR to get closed because there are no changes
    //await mergeGit.push("origin", workingLocalBranch, [ "-f" ]);

    return mergeGit;
}

/**
 * Deletes the local named branch
 * @param git - The SimpleGit instance for the repo to use
 * @param repoName - The configured repo name *(key of the RepoDetails)
 * @param details - The repo details which is used to create the local branch
 * @param forceDelete - Should the branch be force deleted
 */
 export async function deleteLocalBranch(git: SimpleGit, repoName: string, details: IRepoDetails, forceDelete?: boolean) {
    log(`Removing Local branch for ${repoName}...`)
    let branches = await git.branch().catch(abort(git, "Failed getting branches"));
    if (branches && branches.branches[details.mergeBranchName]) {
        // Remove the local branch
        await git.deleteLocalBranch(details.mergeBranchName, forceDelete).catch(abort(git, `Failed to remove branch for ${repoName} -- ${details.mergeBranchName}`));
    }
}
