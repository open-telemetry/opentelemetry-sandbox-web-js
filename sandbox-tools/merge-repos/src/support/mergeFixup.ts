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
import { SimpleGit } from "simple-git";
import { ICommitDetails } from "../git/commit";
import { log, logAppendMessage } from "./utils";

export async function validateFile(
    mergeGitRoot: string,
    masterFile: string,
    destFile: string,
    commitDetails: ICommitDetails) {

    let changed = false;
    if (fs.existsSync(destFile)) {
        // Compare contents
        let destStats = fs.statSync(destFile);
        let masterStats = fs.statSync(masterFile);
        if (destStats.size !== masterStats.size) {
            // File size is different so was not moved / merged correctly
            commitDetails.message = logAppendMessage(mergeGitRoot, commitDetails.message, { index: "x", working_dir: "S", path: destFile } , `Re-Copying master file as size mismatch ${destStats.size} !== ${masterStats.size}`);
            fs.copyFileSync(masterFile, destFile);
            changed = true;
        } else {
            // Same file size, so compare contents
            let masterContent = fs.readFileSync(masterFile);
            let destContent = fs.readFileSync(destFile);
            if (masterContent.length !== destContent.length) {
                // File content is different so was not moved / merged correctly
                commitDetails.message = logAppendMessage(mergeGitRoot, commitDetails.message, { index: "x", working_dir: "C", path: destFile } , "Re-Copying master file as content mismatch");
                fs.copyFileSync(masterFile, destFile);
                changed = true;
            } else {
                let isSame = true;
                let lp = 0;
                while (isSame && lp < masterContent.length) {
                    if (masterContent[lp] !== destContent[lp]) {
                        isSame = false;
                    }
                    lp++;
                }

                if (!isSame) {
                    // File content is different so was not moved / merged correctly
                    commitDetails.message = logAppendMessage(mergeGitRoot, commitDetails.message, { index: "x", working_dir: "C", path: destFile } , "Re-Copying master file as content is different");
                    fs.copyFileSync(masterFile, destFile);
                    changed = true;
                }
            }
        }
    } else {
        // Missing dest so was not moved / merged correctly
        commitDetails.message = logAppendMessage(mergeGitRoot, commitDetails.message, { index: "x", working_dir: "M", path: destFile } , "Re-Copying master file");
        fs.copyFileSync(masterFile, destFile);
        changed = true;
    }

    return changed;
}

export async function checkFixBadMerges(
    git: SimpleGit, 
    mergeGitRoot: string, 
    isVerifyIgnore: (repoName: string, destFolder: string, source: string, ignoreOtherRepoFolders: boolean) => boolean, 
    repoName: string, 
    baseFolder: string, 
    destFolder: string, 
    commitDetails: ICommitDetails, 
    level: number) {

    // Get master source files
    const masterFiles = fs.readdirSync(baseFolder);
    const destFiles = fs.readdirSync(destFolder);

    log(` - (Verifying) ${baseFolder} <=> ${destFolder}`);
    for (let mLp = 0; mLp < masterFiles.length; mLp++) {
        let theFile = masterFiles[mLp];
        if (!isVerifyIgnore(repoName, destFolder, theFile, true)) {
            // log(` - (...) ${baseFolder + "/" + masterFiles[mLp]} ==> ${theFile}`);
            let masterStats = fs.statSync(baseFolder + "/" + theFile);
            if (masterStats.isDirectory()) {
                if (fs.existsSync(destFolder + "/" + theFile)) {
                    let destStats = fs.statSync(destFolder + "/" + theFile);
                    if (destStats.isDirectory()) {
                        await checkFixBadMerges(git, mergeGitRoot, isVerifyIgnore, repoName, baseFolder + "/" + theFile, destFolder + "/" + theFile, commitDetails, level + 1);
                    } else {
                        log(` - (Mismatch) ${destFolder + "/" + theFile} is not a folder`);
                        commitDetails.message = logAppendMessage(mergeGitRoot, commitDetails.message, { index: "x", working_dir: "T", path: destFolder + "/" + theFile } , "Dest is file should be folder");
                        await git.rm(destFolder + "/" + theFile)
    
                        fs.mkdirSync(destFolder + "/" + theFile);
                        await checkFixBadMerges(git, mergeGitRoot, isVerifyIgnore, repoName, baseFolder + "/" + theFile, destFolder + "/" + theFile, commitDetails, level + 1);
                    }
                } else {
                    log(` - (Missing) ${baseFolder} <=> ${destFolder}`);
                    fs.mkdirSync(destFolder + "/" + theFile);
                    await checkFixBadMerges(git, mergeGitRoot, isVerifyIgnore, repoName, baseFolder + "/" + theFile, destFolder + "/" + theFile, commitDetails, level + 1);
                }
            } else {
                // Assume file
                if (validateFile(mergeGitRoot, baseFolder + "/" +  theFile,  destFolder + "/" +  theFile, commitDetails)) {

                    await git.raw([
                        "add",
                        "-f",
                        destFolder + "/" +  theFile]);
                }
            }
        } else {
            log(` - (xI) ${baseFolder + "/" + masterFiles[mLp]} ==> ${theFile}`);
        }
    }

    // Remove any files / folders that do not exist in the master repo
    for (let dLp = 0; dLp < destFiles.length; dLp++) {
        let destFile = destFiles[dLp];
        if (masterFiles.indexOf(destFile) === -1 && !isVerifyIgnore(repoName, destFolder, destFile, true)) {
            let destStats = fs.statSync(destFolder + "/" + destFile);
            if (destStats.isDirectory()) {
                commitDetails.message = logAppendMessage(mergeGitRoot, commitDetails.message, { index: "*", working_dir: "F", path: destFolder + "/" + destFile } , `Removing extra folder ${destFile}`);
                try {
                    await git.raw([
                        "rm",
                        "-f",
                        "-r",
                        destFolder + "/" + destFile]);
                } catch (e) {
                    fs.rmdirSync(destFolder + "/" + destFile, {
                        recursive: true
                    });
                }
            } else {
                commitDetails.message = logAppendMessage(mergeGitRoot, commitDetails.message, { index: "*", working_dir: "E", path: destFolder + "/" + destFile } , "Removing extra file");
                await git.rm(destFolder + "/" + destFile);
            }
        }
    }
}
