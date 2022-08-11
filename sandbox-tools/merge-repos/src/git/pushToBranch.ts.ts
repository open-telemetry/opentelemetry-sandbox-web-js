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

import { fail } from "assert";
import { SimpleGit} from "simple-git";
import { getRemoteList } from "../git/remotes";
import { log } from "../support/utils";

/**
 * Push the current branch to the origin repository
 * @param git - The Simple Git instance for this repo
 * @returns true if the push was performed, otherwise false.
 */
export async function pushToBranch(git: SimpleGit) {
    let status = await git.status();
    let branchName = status.current;
    
    log(`${branchName}, status = ahead ${status.ahead}; behind ${status.behind}`);
    if (status.ahead > 0 || status.behind > 0) {

        let remotes = await getRemoteList(git);
        if (!remotes.origin) {
            fail(`Origin remote does not exist ${JSON.stringify(remotes, null, 4)}`);
        }
    
        log(`Pushing changes to - origin/${branchName} => ${remotes.origin.push} for ${status.current}`);

        await git.push([
            "-f",
            "--set-upstream",
            "origin",
            branchName
        ]);

        // Push the tags as well
        await git.pushTags(remotes.origin.push);

        return true;
    } else {
        log("No push required...");
    }

    return false;
}
