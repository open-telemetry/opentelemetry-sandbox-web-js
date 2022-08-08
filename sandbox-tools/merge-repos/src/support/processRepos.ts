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

import { IRepoDetails, IRepoSyncDetails } from "./types";

/**
 * Helper async function to process the defined repositories calling the callback for each
 * definition.
 * @param theRepos - The configured repositories
 * @param cb - the callback function to call with the repo details.
 */
export async function processRepos(theRepos: IRepoSyncDetails, cb: (name: string, details: IRepoDetails) => Promise<any>) {
    let repoNames = Object.keys(theRepos);
    for (let lp = 0; lp < repoNames.length; lp++) {
        let repoName = repoNames[lp];
        await cb(repoName, theRepos[repoName]);
    }
}