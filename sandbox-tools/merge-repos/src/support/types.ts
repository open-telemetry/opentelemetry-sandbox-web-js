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

export declare type CleanupFunc = (git: SimpleGit) => Promise<any>;

/**
 * Identifies the source repo details
 */
 export interface IRepoDetails {
    /**
     * The full github repo to use as the source
     */
    url : string;

    /**
     * The branch from the source repo to use
     */
    branch: string;

    /**
     * The prefix to apply to remote tags when merging into the destination repo.
     * If not defined defaults to the <repo key name>
     */
    tagPrefix?: string;

    /**
     * The destination in the final "Merged" repo where this repo should be relocated to.
     * If not defined defaults to MERGE_DEST_BASE_FOLDER + "/" + <repo key name>
     */
    destFolder?: string;

    /**
     * The name to use for the local branch during merge operations (not pushed to the repo),
     * if not defined defaults to BRANCH_PREFIX + "/" + <repo key name>
     */
    mergeBranchName?: string;

    /**
     * [Optional] Identifies the point to for the branch to be merged against.
     * Defaults to undefined and therefore the HEAD of the specified branch
     */
    mergeStartPoint?: string;
}

/**
 * Identifies the collection of repos' to be merged and sync'd
 */
export interface IRepoSyncDetails {
    /**
     * Identifies the repo to be merged / sync'd, the value of the `key` is used as the local
     * remote name (via `git add remote <key>`) and therefore should NOT be previously used values
     * like `origin` and `upstream`.
     */
    [key: string]: IRepoDetails
}

