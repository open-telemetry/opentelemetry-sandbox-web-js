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

import { IRepoSyncDetails } from "./support/types";

/**
 * This identifies both the initial source and the final destination for the merge.
 * ie. The created PR will be created to merge back into this repo
 */
export const MERGE_ORIGIN_REPO = "open-telemetry/opentelemetry-sandbox-web-js";

/**
 * Identifies both the initial source and final destination branch for the merge
 * ie. The created PR will be created to merger back into this branch for the Origin Repo
 */
export const MERGE_ORIGIN_MERGE_MAIN_BRANCH = "main";

/**
 * Identifies both the initial source and final destination branch for the merge
 * ie. The created PR will be created to merger back into this branch for the Origin Repo
 */
export const MERGE_ORIGIN_STAGING_BRANCH = "auto-merge/repo-staging";

/**
 * Identifies the working repo to use as the destination fork
 */
export const MERGE_FORK_REPO = "open-telemetry/opentelemetry-sandbox-web-js";

/**
 * The local relative location to generate the local fork and merge repos
 */
export const MERGE_CLONE_LOCATION = ".auto-merge/temp";

/**
 * The base folder where all of the repositories being merged will be located into.
 */
export const MERGE_DEST_BASE_FOLDER = "auto-merge";

/**
 * The prefix to apply to all local branches
 */
export const BRANCH_PREFIX = "auto-merge";

/**
 * When Committing to the local branches add this as the prefix
 */
export const COMMIT_PREFIX = "[AutoMerge]";

/**
 * Identifies the master source repositories to me merged into the `MERGE_DEST_BASE_FOLDER`
 * of the destination repo `MERGE_ORIGIN_STAGING_BRANCH`
 * The contrib repo if needed to be merged, just needs to be added here
 */
export const reposToSyncAndMerge: IRepoSyncDetails = {
    "otel-js-api": {
        url: "https://github.com/open-telemetry/opentelemetry-js-api",
        branch: "main",
        //mergeStartPoint: "HEAD",   // Used for local testing to validate periodic execution
        destFolder: MERGE_DEST_BASE_FOLDER + "/api",
        // mergeBranchName: BRANCH_PREFIX + "/js-api"
    },
    "otel-js": {
        url: "https://github.com/open-telemetry/opentelemetry-js",
        branch: "main",
        //mergeStartPoint: "HEAD",    // Used for local testing to validate periodic execution
        destFolder: MERGE_DEST_BASE_FOLDER + "/js"
    }
};

/**
 * Apply any expected defaults to the provided configuration, this is a helper
 * to ensure that the expected values (for the script) are always present
 * @param theRepos - The IRepoSyncDetails to ensure that the defaults are set
 */
export function applyRepoDefaults(theRepos: IRepoSyncDetails) {
    // Set default values
    Object.keys(theRepos).forEach(async (repoName) => {
        let repoDetails = theRepos[repoName];

        repoDetails.destFolder = repoDetails.destFolder || MERGE_DEST_BASE_FOLDER + "/" + repoName;
        repoDetails.mergeBranchName = repoDetails.mergeBranchName || BRANCH_PREFIX + "/" + repoName;
        repoDetails.tagPrefix = repoDetails.tagPrefix || repoName;
        // repoDetails.mergeStartPoint = repoDetails.mergeStartPoint || repoName + "/" + repoDetails.branch;
    });
}