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
import { getRemoteList } from "./remotes";
import { log } from "../support/utils";

/**
 * The User details identified and to use when setting
 */
export interface UserDetails {
    /**
     * The current git `user.name`
     */
    name: string;

    /**
     * The current git `user.email`
     */
    email: string;

    /**
     * The "owner" of the current git `origin` repo
     */
    user: string;
}

/**
 * Get the current user details for the git instance
 * @param git - The SimpleGit instance for this repo
 * @returns 
 */
export async function getUser(git: SimpleGit, overrideUser?: string): Promise<UserDetails> {
    let userEmail = (await git.getConfig("user.email")).value;
    let userName = (await git.getConfig("user.name")).value;

    let originUser = "";
    if (userEmail) {
        // Try and identify the origin user from the email
        let checkEmail = /\d+\+([^@]+)@users\.noreply\.github\.com/.exec(userName.trim());
        if (checkEmail && checkEmail.length > 1) {
            originUser = checkEmail[1];
        }
    }

    let remotes = await getRemoteList(git);
    if (remotes.origin && remotes.origin.fetch) {
        let remoteFetch = remotes.origin.fetch;
        let idx = remoteFetch.indexOf("github.com/");
        if (idx !== -1) {
            let endIdx = remoteFetch.indexOf("/", idx + 11);
            if (endIdx !== -1) {
                originUser = remoteFetch.substring(idx + 11, endIdx);
            }
        }
    }

    return {
        name: userName,
        email: userEmail,
        user: overrideUser || originUser
    };
}

/**
 * Set the git `user.name` and `user.email` for the current git instance.
 * @param git - The SimpleGit instance to use for this repo
 * @param userDetails - The user details to set for the current repo.
 */
export async function setUser(git: SimpleGit, userDetails: UserDetails) {
    // Set the user to be the same as the current user
    log(`Setting user.name ${userDetails.name} and email ${userDetails.email}`);
    await git.addConfig("user.email", userDetails.email, false);
    await git.addConfig("user.name", userDetails.name, false);
}
