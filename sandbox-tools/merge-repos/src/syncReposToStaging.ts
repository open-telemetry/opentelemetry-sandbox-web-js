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

import { CleanOptions, FileStatusResult, SimpleGit, StatusResult} from "simple-git";
import * as fs from "fs";
import * as path from "path";
import { commitChanges, ICommitDetails } from "./git/commit";
import { createGit } from "./git/createGit";
import { createLocalBranch } from "./git/createLocalBranch";
import { pushToBranch } from "./git/pushToBranch.ts";
import { renameTags } from "./git/renameTags";
import { addRemoteAndFetch, removeTemporaryRemotes } from "./git/remotes";
import { getUser } from "./git/userDetails";
import { checkPrExists } from "./github/checkPrExists";
import { createPullRequest, gitHubCreateForkRepo } from "./github/github";
import { abort, fail, terminate } from "./support/abort";
import { addCleanupCallback, doCleanup } from "./support/clean";
import { isIgnoreFolder } from "./support/isIgnoreFolder";
import { parseArgs, ParsedOptions, SwitchBase } from "./support/parseArgs";
import { processRepos } from "./support/processRepos";
import { IRepoDetails, IRepoSyncDetails } from "./support/types";
import { findCurrentRepoRoot, formatIndentLines, log } from "./support/utils";
import { applyRepoDefaults, MERGE_CLONE_LOCATION, reposToSyncAndMerge, MERGE_ORIGIN_REPO, MERGE_ORIGIN_STAGING_BRANCH } from "./config";

/**
 * The command line options for this script
 */
interface SyncRepoToStagingOptions extends SwitchBase {
    cloneTo: string;
    originRepo: string;
    originBranch: string;
}

// The current git repo root
const _gitRoot = findCurrentRepoRoot();

// The path that will be used for the merge git root (clone / working folder)
let _mergeGitRoot: string;

// Holds the current branch, so it can be restore if necessary on normal exit
let _currentBranch: string;

/**
 * The default command line arguments
 */
let _theArgs: ParsedOptions<SyncRepoToStagingOptions> = {
    failed: false,
    values: [],
    switches: {
        "cloneTo": MERGE_CLONE_LOCATION,
        "originBranch": MERGE_ORIGIN_STAGING_BRANCH,
        "originRepo": MERGE_ORIGIN_REPO
    }
};

/**
 * Show the Help for this tool
 */
function showHelp() {
    var scriptParts;
    var scriptName = _theArgs.name;
    if (scriptName.indexOf("\\") !== -1) {
        scriptParts = scriptName.split("\\");
        scriptName = scriptParts[scriptParts.length - 1];
    } else if (scriptName.indexOf("/") !== -1) {
        scriptParts = scriptName.split("/");
        scriptName = scriptParts[scriptParts.length - 1];
    }

    console.log("");
    console.log(scriptName + " [-cloneTo <...>][-originBranch <...>][-originRepo <...>]");
    console.log("".padEnd(99, "-"));
    console.log(formatIndentLines(25, ` -cloneTo <location>    - The working location of where to clone the original repo, defaults to \"${MERGE_CLONE_LOCATION}\"`, 99));
    console.log(formatIndentLines(25, ` -originBranch <branch> - Identifies both the initial source and final destination branch for the merge, defaults to \"${MERGE_ORIGIN_STAGING_BRANCH}\"`, 99));
    console.log(formatIndentLines(25, ` -originRepo <repo>     - This identifies both the initial source and the final destination for the merge, defaults to \"${MERGE_ORIGIN_REPO}\"`, 99));

    terminate(2);
}

/**
 * Initialize this script by creating a new git clone instance of the originRepo
 * @param localGit - The SimpleGit instance to use for the current initial repository
 * @param originRepo - The originRepo in the form <owner>/<reponame>
 * @param originBranch - The origin branch to use as the source branch for the local clone
 * @param workingBranch - Identifies the local working branch that will also be pushed to the current users repo
 * @returns A new SimpleGit instance for working with the new local cloned origin repo in the forkDest
 */
async function _init(localGit: SimpleGit, originRepo: string, originBranch: string, workingBranch: string): Promise<SimpleGit> {
    _currentBranch = (await localGit.branch()).current;
    log("Current Branch: " + _currentBranch);

    addCleanupCallback(async () => {
        let currentBranch = (await localGit.branch()).current;
        if (currentBranch !== _currentBranch) {
            log(`Switching back to ${_currentBranch}`);
            await localGit.checkout(_currentBranch).catch(abort(localGit, `Unable to checkout ${_currentBranch}`));
        }
    });

    // Set default values
    applyRepoDefaults(reposToSyncAndMerge);

    _mergeGitRoot = path.resolve(_gitRoot, _theArgs.switches.cloneTo).replace(/\\/g, "/");
    log(`MergeRoot: ${_mergeGitRoot}`);

    const repoTokens = originRepo.split("/");
    if (repoTokens.length !== 2) {
        fail(localGit, `${originRepo} must be in the format <owner>/<repo-name>`);
    }

    const repoName = repoTokens[1];

    let userDetails = await getUser(localGit);
    let destUser = userDetails.name;
    if (!destUser || destUser.indexOf(" ") !== -1) {
        destUser = userDetails.user;
    }

    // Make sure the user has forked the repo and if not create one
    await gitHubCreateForkRepo(_gitRoot, originRepo);

    // Now lets go and create a local repo
    let mergeGit = await createLocalBranch(localGit, _mergeGitRoot, originRepo, originBranch, destUser, repoName, workingBranch, userDetails);

    await removeTemporaryRemotes(mergeGit, reposToSyncAndMerge);
    await removePotentialMergeConflicts(mergeGit, reposToSyncAndMerge, _mergeGitRoot);

    return mergeGit;
}

/**
 * Remove any files that may cause merge conflicts from the source branch that we are going to merge into
 * @param git - The SimpleGit instance to use for this repo
 * @param theRepos - The configured repos that we are going to merge into this branch
 * @param baseFolder - The base folder for this repo
 */
async function removePotentialMergeConflicts(git: SimpleGit, theRepos: IRepoSyncDetails, baseFolder: string): Promise<ICommitDetails> {
    log("Removing Potential merge conflicting files from original branch");
    const files = fs.readdirSync(baseFolder);
    let removed = 0;

    let details = "Deleted...";
    for (let lp = 0; lp < files.length; lp++) {
        let inputFile = files[lp];
        if (!isIgnoreFolder(theRepos, inputFile, true)) {
            log(`Deleting ${inputFile}`);
            await git.rm(inputFile).catch(abort(git, `Unable to remove ${inputFile}`));
            details += "\n - " + inputFile;
            removed++;
        }
    };

    if (removed > 0) {
        let commitDetails = {
            committed: false,
            message: `Removed ${removed} potential conflicting file${removed > 1 ? "s" : ""}${details}`
        };

        commitDetails.committed = await commitChanges(git, commitDetails);

        return commitDetails;
    }

    return null;
}

/**
 * Merge the remote original master source repo (opentelemetry-js; opentelemetry-js-api) into the
 * current branch of the provided git instance. This is how the history from the original master
 * repo's are "moved" into the sandbox repo
 * @param git - The SimpleGit instance to use for the local merge repo
 * @param name - The configured name of the original master repo that is represented by the `details`
 * @param details - The details of the original master repo that we want to merge into this branch
 */
async function mergeRemoteIntoBranch(git: SimpleGit, name: string, details: IRepoDetails): Promise<ICommitDetails> {

    let checkoutArgs = [
        "--progress",
        "-B", details.mergeBranchName
    ];

    if (details.mergeStartPoint) {
        // Used for testing the the consistent "merging" over time based on using the configured
        // tags (startPoints) from the original master repo.
        checkoutArgs.push(details.mergeStartPoint);
    } else {
        checkoutArgs.push(name + "/" + details.branch)
    }

    // Create the a local branch of the original master remote repository to be merged into
    log(`Creating new local branch ${details.mergeBranchName} from ${name}/${details.branch}`);
    await git.checkout(checkoutArgs);

    // Reset the local branch to the requested HEAD (or mergeStartPoint -- used for testing)
    log("Resetting...");
    await git.reset(["--hard"]).catch(abort(git, "Failed to hard reset"));

    // Remove any untracked files in this local branch
    log("Cleaning...");
    // The excludes where for local development / branch purposes to ensure local changes where not lost
    await git.clean([CleanOptions.RECURSIVE, CleanOptions.FORCE, CleanOptions.EXCLUDING], ["sandbox-tools/**", "-e", "/.vs"]).catch(abort(git, "Failed during clean"));

    // Merge changes from the remote repo to this branch
    log(`Merging branch ${details.mergeBranchName}`);

    let mergeArgs = [
        "--allow-unrelated-histories",
        "--no-commit",
        "-X", "theirs",
        "--progress",
        "--no-edit",
        details.mergeBranchName
    ];

    let remoteHead = await git.listRemote([
        name,
        details.mergeStartPoint ? details.mergeStartPoint : "HEAD"
    ]).catch(abort(git, `Failed listing remote ${name} HEAD`)) as string;
    let commitHash = /([^\s]*)/.exec(remoteHead)[1];
    let hashDetails = await git.show(["-s", commitHash]).catch(abort(git, `Failed getting hash details ${commitHash}`));
    let commitDetails: ICommitDetails = {
        committed: false,
        message: `Merging ${name} @ [${commitHash.substring(0, 7)}...](${details.url}/commit/${commitHash})\n${hashDetails}`
    };

    await git.merge(mergeArgs).catch(async (reason) => {
        // Resolve any unexpected conflicts (Generally there should not be any) as this local branch is "new" (this was primarily for testing merging scenarios)
        commitDetails.committed = await resolveConflictsToTheirs(git, commitDetails, false);
    });

    // Commit changes to local branch
    commitDetails.committed = await commitChanges(git, commitDetails);

    let ignoreTags: string[] = [];
    Object.keys(reposToSyncAndMerge).forEach((value) => {
        ignoreTags.push(reposToSyncAndMerge[value].tagPrefix + "/");
    });

    // rename the tags from the original repos so they have a prefix and remove the original
    await renameTags(git, reposToSyncAndMerge, details.tagPrefix + "/", ignoreTags);

    return commitDetails;
}

function getFileStatus(status: StatusResult, name: string): FileStatusResult {
    for (let lp = 0; lp < status.files.length; lp++) {
        if (status.files[lp].path === name) {
            return status.files[lp];
        }
    }

    return null;
}

/**
 * Helper to resolve merge conflicts in favor of the original master repo's
 * 
 * The git "status" values
 * ' ' = unmodified
 * M = modified
 * T = file type changed (regular file, symbolic link or submodule)
 * A = added
 * D = deleted
 * R = renamed
 * C = copied (if config option status.renames is set to "copies")
 * U = updated but unmerged
 * 
 * index      workingDir     Meaning
 * -------------------------------------------------
 *            [AMD]   not updated
 * M          [ MTD]  updated in index
 * T          [ MTD]  type changed in index
 * A          [ MTD]  added to index                        <-- (T) not handled
 * D                  deleted from index
 * R          [ MTD]  renamed in index
 * C          [ MTD]  copied in index
 * [MTARC]            index and work tree matches           <-- Not handled here as === Not conflicting
 * [ MTARC]      M    work tree changed since index
 * [ MTARC]      T    type changed in work tree since index <-- not handled, should not occur
 * [ MTARC]      D    deleted in work tree
 *               R    renamed in work tree
 *               C    copied in work tree
 * -------------------------------------------------
 * D             D    unmerged, both deleted
 * A             U    unmerged, added by us                 <-- not handled, should not occur
 * U             D    unmerged, deleted by them
 * U             A    unmerged, added by them
 * D             U    unmerged, deleted by us
 * A             A    unmerged, both added
 * U             U    unmerged, both modified
 * -------------------------------------------------
 * ?             ?    untracked
 * !             !    ignored
 * -------------------------------------------------
 */
async function resolveConflictsToTheirs(git: SimpleGit, commitDetails: ICommitDetails, performCommit: boolean): Promise<boolean> {

    function logAppendMessage(commitMessage: string, fileStatus :FileStatusResult, message: string) {
        let logMessage = ` - (${fileStatus.index.padEnd(1)}${fileStatus.working_dir.padEnd(1)}) ${fileStatus.path} - ${message}`;
        log(logMessage);
        if (commitMessage.length + logMessage.length < 2048) {
            commitMessage += `\n${logMessage}`;
        } else if (commitMessage.indexOf("...truncated...") === -1) {
            commitMessage += "\n...truncated...";
        }

        return commitMessage;
    }

    function describeStatus(status: string) {
        switch(status) {
            case "_":
                return "Not Modified";
            case "M":
                return "Modified";
            case "T":
                return "Type Changed";
            case "A":
                return "Added";
            case "D":
                return "Deleted";
            case "R":
                return "Renamed";
            case "C":
                return "Copied";
            case "U":
                return "Updated";
            default:
        }

        return "Unknown(" + status + ")";
    }
            
    let status = await git.status().catch(abort(git, "Unable to get status")) as StatusResult;
    if (status.conflicted.length === 0) {
        log(`No Conflicts - ${commitDetails.message}`)
        // No Conflicts
        return false;
    }

    let commitSummary = {
    };

    log(`Resolving ${status.conflicted.length} conflicts`);
    commitDetails.message += `\n### Auto resolving ${status.conflicted.length} conflict${status.conflicted.length > 1 ? "s" : ""} to select the master repo version`;

    let commitMessage = "";
    for (let lp = 0; lp < status.conflicted.length; lp++) {
        let conflicted = status.conflicted[lp];
        let fileStatus = getFileStatus(status, conflicted);
        let fileState = `${fileStatus.index.padEnd(1)}${fileStatus.working_dir.padEnd(1)}`.replace(/\s/g, "_");
        commitSummary[fileState] = (commitSummary[fileState] + 1 || 1);
        if (fileStatus.index === "D") {
            // index      workingDir     Meaning
            // -------------------------------------------------
            // D                  deleted from index
            // D             D    unmerged, both deleted
            // D             U    unmerged, deleted by us
            commitMessage = logAppendMessage(commitMessage, fileStatus, "Removed from theirs");
            await git.rm(conflicted);
        } else if (fileStatus.index === "A") {
            // index      workingDir     Meaning
            // -------------------------------------------------
            // [ MTARC]      M    work tree changed since index
            // [ MTARC]      D    deleted in work tree
            // A             A    unmerged, both added
            // A             U    unmerged, added by us                     <-- really means that it was deleted but merge didn't resolve
            // -------------------------------------------------
            // Not handled
            // -------------------------------------------------
            // [MTARC]            index and work tree matches               <-- Not conflicting
            // [ MTARC]      T    type changed in work tree since index     <-- Also should not occur
            if (fileStatus.working_dir === "A") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Added in both => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);
                await git.add(conflicted);
            } else if (fileStatus.working_dir === "M") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Added in theirs, modified in ours => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);
                await git.add(conflicted);
            } else if (fileStatus.working_dir === "D") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Added in theirs, deleted in ours => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);
                await git.add(conflicted);
            } else if (fileStatus.working_dir === "U") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Added in ours => try to checkout theirs");
                try {
                    await git.checkout([
                        "--theirs",
                        conflicted
                    ]);
                    await git.add(conflicted);
                } catch (e) {
                    commitMessage = logAppendMessage(commitMessage, fileStatus, "!!! Unable to checkout theirs so assuming it should be deleted");
                    await git.rm(conflicted);
                }
            } else {
                commitMessage = logAppendMessage(commitMessage, fileStatus, `Unsupported automatic merge state for ${conflicted}`);
            }
        } else if (fileStatus.index === "R") {
            // index      workingDir     Meaning
            // -------------------------------------------------
            // [ MTARC]      M    work tree changed since index
            // [ MTARC]      D    deleted in work tree
            // -------------------------------------------------
            // Not handled
            // -------------------------------------------------
            // [MTARC]            index and work tree matches           <-- Not conflicting
            // [ MTARC]      T    type changed in work tree since index
            if (fileStatus.working_dir === "M") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Renamed in theirs, modified in ours => remove local and checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);
                await git.add(conflicted);
            } else if (fileStatus.working_dir === "D") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Renamed in theirs, deleted in ours => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);
                await git.add(conflicted);
            } else {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "!!! Unsupported automatic renamed merge state");
            }
        } else if (fileStatus.index === "U") {
            // index      workingDir     Meaning
            // -------------------------------------------------
            // U             D    unmerged, deleted by them
            // U             A    unmerged, added by them
            // U             U    unmerged, both modified
            if (fileStatus.working_dir === "D") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Unmerged, deleted by them => remove");
                await git.rm(conflicted);
            } else if (fileStatus.working_dir === "A") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Unmerged, added by them => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);
                await git.add(conflicted);
            } else if (fileStatus.working_dir === "U") {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Unmerged, both modified => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);
                await git.add(conflicted);
            } else {
                commitMessage = logAppendMessage(commitMessage, fileStatus, "Unsupported automatic unmerged state");
            }
        } else {
            commitMessage = logAppendMessage(commitMessage, fileStatus, " => checkout theirs");
            await git.checkout([
                "--theirs",
                conflicted
            ]);
            await git.add(conflicted);
        }
    }

    status = await git.status().catch(abort(git, "Unable to get status")) as StatusResult;
    if (status.conflicted.length !== 0) {
        status.staged = [ `Removed ${status.staged.length} entries for reporting` ];
        await fail(git, `Still has conflicts ${status.conflicted.length} we can't auto resolve - ${commitMessage}\n${JSON.stringify(status, null, 4)}`);
    }

    let summaryKeys = Object.keys(commitSummary);
    if (summaryKeys.length > 0) {
        commitDetails.message += "\nSummary of changes by file state";
        summaryKeys.forEach((value) => {
            let status = describeStatus(value[0]) + " <=> " + describeStatus(value[1]);
            commitDetails.message += `\n${value} (${status}): ${commitSummary[value]}`;
        });
    }

    commitDetails.message += `\n${commitMessage}`;

    // Directly committing as using "git merge --continue" will ALWAYS popup an editor
    if (performCommit) {
        return await commitChanges(git, commitDetails);
    }

    return false;
}

/**
 * Deletes the local named branch
 * @param git - The SimpleGit instance for the repo to use
 * @param repoName - The configured repo name *(key of the RepoDetails)
 * @param details - The repo details which is used to create the local branch
 * @param forceDelete - Should the branch be force deleted
 */
async function deleteLocalBranch(git: SimpleGit, repoName: string, details: IRepoDetails, forceDelete?: boolean) {
    log(`Removing Local branch for ${repoName}...`)
    let branches = await git.branch().catch(abort(git, "Failed getting branches"));
    if (branches && branches.branches[details.mergeBranchName]) {
        // Remove the local branch
        await git.deleteLocalBranch(details.mergeBranchName, forceDelete).catch(abort(git, `Failed to remove branch for ${repoName} -- ${details.mergeBranchName}`));
    }
}

/**
 * Move the repo files into the destFolder, this is called recursively as `git mv` sometimes complains when moving
 * a folder which already exists, this occurs when a previous PR moved the file/folders and new files/folders are
 * added to the original location that now needs to be moved.
 * @param git - The SimpleGit instance for the repo to use
 * @param baseFolder - The base folder for the git instance
 * @param srcFolder - The source folder to be moved
 * @param destFolder - The destination folder to move the source folder to
 * @param commitDetails - Holds the commit details, used to generate the commit message
 */
async function moveRepoTo(git: SimpleGit, baseFolder: string, srcFolder: string, destFolder: string, commitDetails: ICommitDetails) {

    function appendCommitMessage(commitMessage: string, message: string) {
        if (commitMessage.length + message.length < 2048) {
            commitMessage += `\n${message}`;
        } else if (commitMessage.indexOf("...truncated...") === -1) {
            commitMessage += "\n...truncated...";
        }

        return commitMessage;
    }

    let theLocalDestPath = path.resolve(path.join(baseFolder, destFolder)).replace(/\\/g, "/") + "/";
    let theGitDestFolder = destFolder;

    if (srcFolder.length === 0) {
        // Don't log this if we are in recursively moving
        log(`Moving Repo to ${theGitDestFolder}; Local dest path: ${theLocalDestPath}`);
    }

    const files = fs.readdirSync(baseFolder + "/" + srcFolder);
    log(`${files.length} file(s) found in ${baseFolder + "/" + srcFolder} to move`);
    if (!fs.existsSync(theLocalDestPath)) {
        fs.mkdirSync(theLocalDestPath, { recursive: true });
    }

    if (files.length > 0) {
        let commitMessage = "";

        if (srcFolder.length === 0) {
            commitMessage += `\n### Moving additional unmerged (new) files from ${srcFolder ? srcFolder : "./"} to ${theGitDestFolder}`
        }

        for (let lp = 0; lp < files.length; lp++) {
            let inputFile = files[lp];
            if (inputFile !== destFolder && !isIgnoreFolder(reposToSyncAndMerge, inputFile, srcFolder.length === 0)) {
                let fullInputPath = (srcFolder ? srcFolder + "/" : "") + inputFile;

                let moved = false;
                let isSrcDir = false;
                let inputStats = fs.statSync(baseFolder + "/" + fullInputPath);
                if (inputStats.isDirectory()) {
                    log(` - ${fullInputPath}/`);
                    isSrcDir = true;
                } else {
                    log(` - ${fullInputPath}`);
                }

                if (!moved) {
                    await git.raw([
                        "mv",
                        "--force",
                        "--verbose",
                        fullInputPath + (isSrcDir ? "/" : ""),
                        theGitDestFolder + (isSrcDir ? "/" + inputFile + "/" : "")
                    ]);

                    commitMessage = appendCommitMessage(commitMessage, ` - ${fullInputPath}${isSrcDir ? "/" : ""}`)
                }
            } else {
                log(` - Ignoring ${inputFile}  (${destFolder})`);
            }
        };

        commitDetails.message += commitMessage;
    } else {
        log(` - No files found in ${baseFolder + "/" + srcFolder}`);
    }
}

/**
 * Merge the temporary local "merge" branches (used to merge the original master repos into this repo so we have
 * their history here) branch into the final staging merge branch.
 * @param git - The SimpleGit instance for the repo to use
 * @param destBranch - This is the final destination branch to merge the master repo branches into
 * @param details - The holder for the commit details
 * @returns A new ICommitDetails which identifies the changes performed for this function, which may or may not
 * include details from the passed branchCommitDetails.
 */
async function mergeBranchToMergeMaster(git: SimpleGit, destBranch: string, details: IRepoDetails, branchCommitDetails: ICommitDetails): Promise<ICommitDetails> {
    log(`Merging ${details.mergeBranchName} to merge ${destBranch}`);

    // Switch back to the merge branch 
    log(`Checking out ${destBranch}`);
    await git.checkout(destBranch);

    let mergeMessage = "";
    if (branchCommitDetails.message) {
        let branchCommitLines = branchCommitDetails.message.split("\n");
        let idx = 0;
        let cnt = 0;
        while (cnt < 5) {
            if (branchCommitLines[idx]) {
                if (cnt === 0) {
                    mergeMessage += "## " + branchCommitLines[idx];
                } else {
                    mergeMessage += "\n  - " + branchCommitLines[idx];
                }
                cnt++;
            }

            idx++;
        }

        if (branchCommitLines.length >= idx ) {
            mergeMessage += "\n  - ...";
        }
    }

    if (!mergeMessage) {
        mergeMessage = `## Merging changes from local branch ${details.mergeBranchName}`;
    }

    let mergeCommitMessage: ICommitDetails = {
        committed: false,
        message: mergeMessage
    };

    let commitPerformed = false;
    await git.merge([
        "--allow-unrelated-histories",
        "--no-commit",
        "-X", "theirs",
        "--progress",
        "--no-ff",
        "--no-edit",
        details.mergeBranchName]).catch(async (reason) => {
            commitPerformed = await resolveConflictsToTheirs(git, mergeCommitMessage, false);
        });

    // Now Move the merger project to its final destination folder
    await moveRepoTo(git, _mergeGitRoot, "", details.destFolder, mergeCommitMessage);

    mergeCommitMessage.committed = await commitChanges(git, mergeCommitMessage) || commitPerformed;

    return mergeCommitMessage;
}

//---------------------------------------------------------------------------------------------------------------
// Main Script execution
//---------------------------------------------------------------------------------------------------------------

if (!_gitRoot) {
    console.error("Unable to locate the repo root");
    terminate(2);
}

addCleanupCallback(async (git: SimpleGit)  => {
    //await removeTemporaryRemotes(git, reposToSyncAndMerge);
});

_theArgs = parseArgs({
    switches: {
        "cloneTo": true,
        "originBranch": true,
        "originRepo": true
    },
    defaults: {
        values: _theArgs.values,
        switches: _theArgs.switches
    }
});

if (_theArgs.switches.showHelp) {
    showHelp();
}

if (_theArgs.failed) {
    fail(null, `Failed parsing arguments - ${JSON.stringify(_theArgs.errors, null, 4)}`);
}

const localGit = createGit(_gitRoot, "local.git");
log(`CWD: ${process.cwd()}; gitRoot: ${_gitRoot}`);

localGit.checkIsRepo().then(async (isRepo) => {
    if (isRepo) {
        // Lets go and process the repos
        log("We have a repo");
        const originRepo = _theArgs.switches.originRepo;
        const originRepoUrl = "https://github.com/" + originRepo;
        const originBranch = _theArgs.switches.originBranch;

        let userDetails = await getUser(localGit);

        let workingBranch = userDetails.name + "/" + (originBranch.replace(/\//g, "-"));
        if (userDetails.name.indexOf(" ") !== -1) {
            workingBranch = userDetails.user + "/" + (originBranch.replace(/\//g, "-"));
        }

        const mergeGit = await _init(localGit, originRepo, originBranch, workingBranch);

        let existingPr = await checkPrExists(mergeGit, _mergeGitRoot, originRepoUrl, originBranch);
        if (existingPr) {
            await fail(localGit, `A PR already exists -- please commit or close the previous PR`)
        }

        let prTitle = "[AutoMerge] Merging change(s) from ";
        let prBody = "";
        let createPr = false;
        
        console.log("Merge all Repos");

        let branchCommitDetails: { [key: string]: ICommitDetails } = { };

        // Merge and Sync all of the source repos
        await processRepos(reposToSyncAndMerge, async (repoName, repoDetails) => {
            log(`Merging ${repoName} from ${repoDetails.url} using ${repoDetails.mergeBranchName} into ${repoDetails.destFolder}`);

            await addRemoteAndFetch(mergeGit, repoName, repoDetails);
            branchCommitDetails[repoName] = await mergeRemoteIntoBranch(mergeGit, repoName, repoDetails);
            //await removeRemote(mergeGit, repoName);
        });

        // Now merge / move each repo into the staging location
        console.log("Now merge repos into main merge staging")
        await processRepos(reposToSyncAndMerge, async (repoName, repoDetails) => {
            let commitDetails = await mergeBranchToMergeMaster(mergeGit, workingBranch, repoDetails, branchCommitDetails[repoName]);
            if (commitDetails.committed) {
                prTitle += repoName + "; ";
                if (prBody) {
                    prBody += "\n";
                }
                prBody += `# Changes from ${repoName}@${repoDetails.branch} (${repoDetails.url})\n${commitDetails.message}`;
                createPr = true;
            }
        });

        // Remove local branches
        // await processRepos(reposToSyncAndMerge, async (repoName, repoDetails) => {
        //     await deleteLocalBranch(mergeGit, repoName, repoDetails, true);
        // });

        if (createPr && await pushToBranch(mergeGit)) {
            await createPullRequest(mergeGit, _mergeGitRoot, prTitle, prBody, originRepo, originBranch)
        }

        await doCleanup(mergeGit);
    } else {
        await fail(localGit, "We are not running inside a repo");
    }
}, async (reason) => {
    await fail(localGit, "Unable to check if this is a valid repo - " + JSON.stringify(reason));
});
