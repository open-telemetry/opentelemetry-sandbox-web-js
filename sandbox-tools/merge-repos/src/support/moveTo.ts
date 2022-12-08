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

import * as fs from "fs";
import * as path from "path";
import { SimpleGit } from "simple-git";
import { reposToSyncAndMerge } from "../config";
import { ICommitDetails } from "../git/commit";
import { isIgnoreFolder } from "./isIgnoreFolder";
import { log } from "./utils";

export async function moveFolder(git: SimpleGit, commitMessage: string, baseFolder: string, from: string, to: string, level: number) {

    if (from !== to && !isIgnoreFolder(reposToSyncAndMerge, from, level === 0)) {
        let moved = false;
        let isSrcDir = false;
        let inputStats = fs.statSync(baseFolder + "/" + from);
        if (inputStats.isDirectory()) {
            //log(` - ${fullInputPath}/`);
            isSrcDir = true;

            // Move the files independently
            let dirs = [];
            let fromFiles = [];

            if (fs.existsSync(baseFolder + "/" + from)) {
                let dirFiles = fs.readdirSync(baseFolder + "/" + from);
                for (let lp = 0; lp < dirFiles.length; lp++) {
                    let newFrom = (from ? (from + "/") : "") + dirFiles[lp];
                    let newFromStats = fs.statSync(baseFolder + "/" + newFrom);
                    if (newFromStats.isFile()) {
                        fromFiles.push(newFrom);
                    } else if (newFromStats.isDirectory() && !isIgnoreFolder(reposToSyncAndMerge, newFrom, level === 0)) {
                        dirs.push(dirFiles[lp]);
                    }
                }
            }

            let toDirExists = false;
            if (fs.existsSync(baseFolder + "/" + to)) {
                let inputStats = fs.statSync(baseFolder + "/" + to);
                if (inputStats.isDirectory()) {
                    toDirExists = true;
                } else {
                    // Destination is a file!!!
                }
            }

            if (fromFiles.length === 0 || level === 0 || toDirExists) {
                if (!fs.existsSync(baseFolder + "/" + to)) {
                    log(` - (Creating) ${baseFolder + "/" + to}`);
                    fs.mkdirSync(baseFolder + "/" + to, { recursive: true });
                }

                for (let lp = 0; lp < fromFiles.length; lp++) {
                    log(` - (File) ${fromFiles[lp]} -> ${to}`);
                    await git.raw([
                        "mv",
                        "--force",
                        "--verbose",
                        path.normalize(fromFiles[lp]),
                        path.normalize(to)
                    ]);
                }

                for (let lp = 0; lp < dirs.length; lp++) {
                    let newFrom = (from ? (from + "/") : "") + dirs[lp];
                    let newTo = to + "/" + dirs[lp]
                    log(` - (Move) ${newFrom} -> ${newTo}`);
                    commitMessage = await moveFolder(git, commitMessage, baseFolder, newFrom, newTo, level + 1);
                }
            } else {
                log(` - (Moving) ${from} -> ${to}`);
                await git.raw([
                    "mv",
                    "--force",
                    "--verbose",
                    path.normalize(from),
                    path.normalize(to + "/..")
                ]);
            }

            // Make sure everything got moved
            if (fs.existsSync(baseFolder + "/" + from)) {
                const checkFiles = fs.readdirSync(baseFolder + "/" + from);
                let fromCnt = 0;
                for (let lp = 0; lp < checkFiles.length; lp++) {
                    if (!isIgnoreFolder(null, checkFiles[lp], level === 0)) {
                        let checkStats = fs.statSync(baseFolder + "/" + from + "/" + checkFiles[lp]);
                        if (checkStats.isFile()) {
                            fromCnt ++;
                        }
                    }
                }

                if (from && fromCnt > 0) {
                    log(`!!! Not all files moved!!) ${fromCnt + " - " + from}`);
                    throw "Not all files moved!!";
                }

                if (from && fromCnt === 0) {
                    // cleanup the from folder
                    log(` - (unlinking) ${baseFolder + "/" + from}`);
                    fs.rmdirSync(baseFolder + "/" + from, {
                        recursive: true
                    });
                }
            }

            moved = true;
        }

        if (!moved) {
            log(` - ${from + (isSrcDir ? "/" : "")} => ${to}`);
            await git.raw([
                "mv",
                "--force",
                "--verbose",
                path.normalize(from + (isSrcDir ? "/" : "")),
                path.normalize(to)
            ]);

            commitMessage = appendCommitMessage(commitMessage, ` - ${from}${isSrcDir ? "/" : ""}`)
        }
    } else {
        log(` - Ignoring ${from}  (${to})`);
    }

    return commitMessage;
}

function appendCommitMessage(commitMessage: string, message: string) {
    if (commitMessage.length + message.length < 2048) {
        commitMessage += `\n${message}`;
    } else if (commitMessage.indexOf("...truncated...") === -1) {
        commitMessage += "\n...truncated...";
    }

    return commitMessage;
}

/**
 * Move the repo files into the destFolder, this is called recursively as `git mv` sometimes complains when moving
 * a folder which already exists, this occurs when a previous PR moved the file/folders and new files/folders are
 * added to the original location that now needs to be moved.
 * @param git - The SimpleGit instance for the repo to use
 * @param baseFolder - The base folder for the git instance
 * @param srcFolder - The source folder to be moved
 * @param destFolder - The destination folder to move the source folder to
 * @param commitDetails - Holds the commit details, used to generate the commit message
 */
 export async function moveRepoTo(git: SimpleGit, baseFolder: string, srcFolder: string, destFolder: string, commitDetails: ICommitDetails) {

    let theLocalDestPath = path.resolve(path.join(baseFolder, destFolder)).replace(/\\/g, "/") + "/";
    let theGitDestFolder = destFolder;

    if (srcFolder.length === 0) {
        // Don't log this if we are in recursively moving
        log(`Moving Repo to ${theGitDestFolder}; Local dest path: ${theLocalDestPath}`);
    }

    const files = fs.readdirSync(baseFolder + "/" + srcFolder);
    log(`${files.length} file(s) found in ${baseFolder + "/" + srcFolder} to move`);
    if (!fs.existsSync(theLocalDestPath)) {
        fs.mkdirSync(theLocalDestPath, { recursive: true });
    }

    if (files.length > 0) {
        let commitMessage = commitDetails.message;

        if (srcFolder.length === 0) {
            commitMessage += `\n### Moving files from ${srcFolder ? srcFolder : "./"} to ${theGitDestFolder}`
        }

        commitMessage = await moveFolder(git, commitMessage, baseFolder, srcFolder, theGitDestFolder, 0);

        commitDetails.message = commitMessage;
    } else {
        log(` - No files found in ${baseFolder + "/" + srcFolder}`);
    }
}

