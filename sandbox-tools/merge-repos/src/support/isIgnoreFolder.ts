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

import { IRepoSyncDetails } from "./types";

/**
 * Helper function used to identify whether the provided source name should be processed
 * or ignored. Used while moving repo files from the master source repos and removing potential
 * conflicts from the destination repo.
 * @param theRepos - The configured repos that will be sync'd
 * @param source - The current value to be checked 
 * @param isRoot - A flag indicating whether this is the root folder or a sub folder.
 * @returns 
 */
export function isIgnoreFolder(theRepos: IRepoSyncDetails, source: string, isRoot: boolean) {
    if (source === "." || source === ".." || source === ".git" || source === ".vs" || source === "protos") {
        return true;
    }

    if (isRoot && theRepos) {
        let repoNames = Object.keys(theRepos);
        for (let lp = 0; lp < repoNames.length; lp++) {
            let destFolder = theRepos[repoNames[lp]].destFolder;
            if (destFolder === source || destFolder.indexOf(source + "/") === 0) {
                return true;
            }
        }
    }

    return false;
}
