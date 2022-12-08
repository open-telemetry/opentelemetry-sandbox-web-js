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

import simpleGit, { SimpleGit, SimpleGitOptions } from "simple-git";
import { log } from "../support/utils";

/**
 * Create a SimpleGit instance using the base (root) directory and the provided progressPrefix
 * for any progress messages.
 * @param baseDir - The root folder for the git repository
 * @param progressPrefix - The prefix string to include in the progress messages
 * @returns 
 */
export function createGit(baseDir: string, progressPrefix: string): SimpleGit {
    let lastCompleteMessage: string;
    let options: Partial<SimpleGitOptions> = {
        baseDir: baseDir,
        progress: ({ method, stage, progress, processed, total }) => {
            let message = `${progressPrefix}.${method} ${stage} stage ${processed}/${total} = ${progress}% complete`;
    
            if (progress === 100 || processed === total) {
                if (lastCompleteMessage !== message) {
                    log(message.padEnd(79));
                    lastCompleteMessage = message;
                }
            } else {
                lastCompleteMessage = null;
                process.stdout.write(message.padEnd(79) + "\r");
            }
        }
    };

    let git = simpleGit(options);
    git.addConfig("merge.renameLimit", "999999");
    git.addConfig("follow", "true");

    return git;
}