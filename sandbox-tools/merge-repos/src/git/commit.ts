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

import { SimpleGit, StatusResult } from "simple-git";
import { abort, fail } from "../support/abort";
import { formatIndentLines, log } from "../support/utils";
import { COMMIT_PREFIX } from "../config";

/**
 * Holds details about the commit that has or should be used
 */
export interface ICommitDetails {
    /**
     * Identifies if a commit has been performed
     */
    committed: boolean;

    /**
     * Holds the commit message that was or should be used
     */
    message: string;
}

/**
 * Perform a commit of the changes using the provided ICommitDetails, if there are changes to
 * be committed, this will only perform a commit if there are any modified, deleted, created,
 * staged or renamed files.
 * @param git - The SimpleGit instance for this repository
 * @param commitDetails - The commit details to use
 * @returns true if a commit was performed, otherwise false if no commit was required.
 */
export async function commitChanges(git: SimpleGit, commitDetails: ICommitDetails) {
    let status = await git.status().catch(abort(git, "Unable to get status")) as StatusResult;
    if (status.conflicted.length > 0) {
        await fail(git, `Conflicting files! -- unable to commit`);
    }
    
    log(`Status: Modified ${status.modified.length}; Deleted: ${status.deleted.length}; Created: ${status.created.length}; Staged: ${status.staged.length}; Renamed: ${status.renamed.length}`);
    if (status.modified.length > 0 || status.deleted.length > 0 || status.created.length > 0 || status.staged.length > 0 || status.renamed.length > 0) {
        log(`Committing Changes - ${formatIndentLines(21, commitDetails.message)}`);
        let commitMessage = COMMIT_PREFIX + " " + commitDetails.message;

        await git.commit(commitMessage, {
            "--no-edit": null,
        }).catch(abort(git, "Unable to Commit"));

        commitDetails.committed = true;
    } else {
        log("No commit required...");
    }

    return commitDetails.committed;
}
