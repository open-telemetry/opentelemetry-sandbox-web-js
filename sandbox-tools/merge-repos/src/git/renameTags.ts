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
import { IRepoSyncDetails } from "../support/types";
import { log } from "../support/utils";

/**
 * Get all of the tag prefixes that will be used
 * @param theRepos - The configured repos
 * @returns 
 */
function getRepoPrefixTags(theRepos: IRepoSyncDetails) {
    let theTags: string[] = [];

    Object.keys(theRepos).forEach((key) => {
        theTags.push(theRepos[key].tagPrefix);
    });

    return theTags;
}

/**
 * Helper to identify whether the identified tag should be ignored or processed, because it's already been prefixed.
 * @param theTag - The current tag
 * @param repoTags - All of the configured tag prefixes
 * @param prefix - The current prefix
 * @param ignoreTagPrefixes - The prefixes that should be ignored
 * @returns true if the tag should be ignored otherwise false
 */
function isIgnoreTag(theTag: string, repoTags: string[], prefix: string, ignoreTagPrefixes: string[]) {
    if (theTag.indexOf(prefix) === 0) {
        // Tag starts with the prefix so ignore it
        return true;
    }

    for (let lp = 0; lp < ignoreTagPrefixes.length; lp++) {
        if (theTag.indexOf(ignoreTagPrefixes[lp]) === 0) {
            // Tag starts with the ignoreTagPrefixes so ignore it
            return true;
        }
    }

    for (let lp = 0; lp < repoTags.length; lp++) {
        if (theTag.indexOf(repoTags[lp]) === 0) {
            return true;
        }
    }

    return false;
}

/**
 * Rename all of the existing repo tags to include the defined prefix
 * @param git - The current SimpleGit instance for this repo
 * @param theRepos - The configured repos that will be processed
 * @param prefix - The current prefix to add to each tag
 * @param ignoreTagPrefixes - The tag prefixes that should be ignore and not changed.
 */
export async function renameTags(git: SimpleGit, theRepos: IRepoSyncDetails, prefix: string, ignoreTagPrefixes: string[]) {
    log(`Renaming Tags ${prefix}`)
    let repoTags = getRepoPrefixTags(theRepos);
    
    let tags = await git.tags();
    if (tags) {
        for (let lp = 0; lp < tags.all.length; lp++) {
            let tag = tags.all[lp];
            if (!isIgnoreTag(tag, repoTags, prefix, ignoreTagPrefixes)) {
                let newTagName = prefix + tag;
                if (tags && tags.all.indexOf(newTagName) === -1) {
                    log(` - ${tag} => ${prefix + tag}`);
                    // rename the tag if the new tagname doesn't exist
                    await git.tag([newTagName, tag]);
                }
                // Delete the old tag
                await git.tag(["-d", tag]);
            }
        }
    }
}
