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

import { FileStatusResult, SimpleGit, StatusResult } from "simple-git";
import { abort, fail } from "../support/abort";
import { log, logAppendMessage } from "../support/utils";
import { commitChanges, ICommitDetails } from "./commit";

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
 export async function resolveConflictsToTheirs(git: SimpleGit, gitRoot: string, commitDetails: ICommitDetails, performCommit: boolean): Promise<boolean> {

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
            if (fileStatus.working_dir === "U") {
                // Deleted by Us
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Deleted by us => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);

                try {
                    await git.raw([
                        "add",
                        "-f",
                        conflicted]);
                } catch (e) {
                    if (!conflicted.endsWith("/protos")) {
                        throw e;
                    } else {
                        log(` - !! Ignoring git add for known submodule folder - ${conflicted}`);
                        await git.rm(conflicted);
                    }
                }
            } else {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, `Removed from ${fileStatus.working_dir === "D" ? "both" : "theirs"}`);
                await git.rm(conflicted);
            }
        } else if (fileStatus.index === "A") {
            // index      workingDir     Meaning
            // -------------------------------------------------
            // [ MTARC]      M    work tree changed since index
            // [ MTARC]      D    deleted in work tree
            // A             A    unmerged, both added
            // A             U    unmerged, added by us                     <-- This could mean that it was deleted from their repo or just added by us and changes from historical versions that merge could not resolve
            // -------------------------------------------------
            // Not handled
            // -------------------------------------------------
            // [MTARC]            index and work tree matches               <-- Not conflicting
            // [ MTARC]      T    type changed in work tree since index     <-- Also should not occur
            if (fileStatus.working_dir === "A") {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Added in both => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);

                try {
                    await git.raw([
                        "add",
                        "-f",
                        conflicted]);
                } catch (e) {
                    if (!conflicted.endsWith("/protos")) {
                        throw e;
                    } else {
                        log(` - !! Ignoring git add for known submodule folder - ${conflicted}`);
                        await git.rm(conflicted);
                    }
                }
            } else if (fileStatus.working_dir === "M") {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Added in theirs, modified in ours => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);

                await git.raw([
                    "add",
                    "-f",
                    conflicted]);
            } else if (fileStatus.working_dir === "D") {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Added in theirs, deleted in ours => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);

                await git.raw([
                    "add",
                    "-f",
                    conflicted]);
            } else if (fileStatus.working_dir === "U") {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Added in ours => checkout ours");
                // Just checkout (keep) our version and any changes / deletions will be resolved during during sync validation steps
                await git.checkout([
                    "--ours",
                    conflicted
                ]);

                await git.raw([
                    "add",
                    "-f",
                    conflicted]);
            } else {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, `Unsupported automatic merge state for ${conflicted}`);
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
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Renamed in theirs, modified in ours => remove local and checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);

                await git.raw([
                    "add",
                    "-f",
                    conflicted]);
            } else if (fileStatus.working_dir === "D") {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Renamed in theirs, deleted in ours => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);

                await git.raw([
                    "add",
                    "-f",
                    conflicted]);
            } else {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "!!! Unsupported automatic renamed merge state");
            }
        } else if (fileStatus.index === "U") {
            // index      workingDir     Meaning
            // -------------------------------------------------
            // U             D    unmerged, deleted by them
            // U             A    unmerged, added by them
            // U             U    unmerged, both modified
            if (fileStatus.working_dir === "D") {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Unmerged, deleted by them => remove");
                await git.rm(conflicted);
            } else if (fileStatus.working_dir === "A") {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Unmerged, added by them => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);

                await git.raw([
                    "add",
                    "-f",
                    conflicted]);
            } else if (fileStatus.working_dir === "U") {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Unmerged, both modified => checkout theirs");
                await git.checkout([
                    "--theirs",
                    conflicted
                ]);

                await git.raw([
                    "add",
                    "-f",
                    conflicted]);
            } else {
                commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, "Unsupported automatic unmerged state");
            }
        } else {
            commitMessage = logAppendMessage(gitRoot, commitMessage, fileStatus, " => checkout theirs");
            await git.checkout([
                "--theirs",
                conflicted
            ]);

            await git.raw([
                "add",
                "-f",
                conflicted]);
        }
    }

    status = await git.status().catch(abort(git, "Unable to get status")) as StatusResult;
    if (status.conflicted.length !== 0) {
        await fail(git, `Still has conflicts ${status.conflicted.length} we can't auto resolve - ${commitMessage}\n${JSON.stringify(status.conflicted, null, 4)}`);
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
