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
import { CleanOptions, SimpleGit } from "simple-git";
import { 
    MERGE_CLONE_LOCATION, MERGE_DEST_BASE_FOLDER, MERGE_ORIGIN_MERGE_MAIN_BRANCH, MERGE_ORIGIN_REPO, MERGE_ORIGIN_STAGING_BRANCH, SANDBOX_PROJECT_NAME,
    addMissingDevDeps, dependencyVersions, dropDependencies, foldersToMerge, initDevDependencyVersions, initScripts, cleanupScripts, filesToMerge, commonDevDependencyVersions, filesToCleanup, mergeFilesToCleanup, fixBadMergeRootFiles, mergeRushCommandLine, rootDevDependencies
} from "./config";
import { commitChanges, ICommitDetails } from "./git/commit";
import { createGit } from "./git/createGit";
import { createLocalBranch } from "./git/createLocalBranch";
import { pushToBranch } from "./git/pushToBranch.ts";
import { addRemoteAndFetch } from "./git/remotes";
import { resolveConflictsToTheirs } from "./git/resolveConflictsToTheirs";
import { getUser, setUser, UserDetails } from "./git/userDetails";
import { checkPrExists } from "./github/checkPrExists";
import { createPullRequest, gitHubCreateForkRepo } from "./github/github";
import { createPackageKarmaConfig } from "./tests/karma";
import { createPackageRollupConfig } from "./rollup/rollup";
import { rushUpdateCommandLine, rushUpdateShrinkwrap } from "./rush/rush";
import { abort, fail, terminate } from "./support/abort";
import { addCleanupCallback, doCleanup } from "./support/clean";
import { isIgnoreFolder } from "./support/isIgnoreFolder";
import { moveFolder } from "./support/moveTo";
import { parseArgs, ParsedOptions, SwitchBase } from "./support/parseArgs";
import { IMergeDetail, IMergePackageDetail, IPackageJson, IPackages, IRepoDetails, IRushJson } from "./support/types";
import { dumpObj, findCurrentRepoRoot, formatIndentLines, log, logError, logWarn, removeTrailingComma, transformContent, transformPackages } from "./support/utils";
import { createPackageWebpackTestConfig } from "./tests/webpack";
import { initPackageJson } from "./package/package";
import { checkFixBadMerges, validateFile } from "./support/mergeFixup";

interface IStagingRepoDetails {
    git: SimpleGit,
    path: string,
    branch: string,
    commitDetails: ICommitDetails
}
/**
 * The command line options for this script
 */
 interface MergeStagingToMainOptions extends SwitchBase {
    cloneTo: string;
    originRepo: string;
    stagingBranch: string;
    destBranch: string;

    stagingStartPoint?: string;                          // Used for local testing to validate periodic execution

    /**
     * Run the script but don't create the final PR and move the destination folder up one level
     * ie. prefix "../" to the cloneTo location
     */
    test: boolean;

    /**
     * Don't create the PR
     */
    noPr: boolean;

    /**
     * Use this user as source repo owner rather than the current user (determined from the git config)
     */
    originUser?: string;

    /**
     * Use this user as the destination repo owner rather than the current user (determined from the git config)
     * The originUser (if supplied) will become the default
     */
    destUser?: string;
}

// The current git repo root
const _gitRoot = findCurrentRepoRoot();

// The path that will be used for the merge git root (clone / working folder)
let _mergeGitRoot: string;

// Holds the current branch, so it can be restore if necessary on normal exit
let _currentBranch: string;

/**
 * The default command line arguments
 */
let _theArgs: ParsedOptions<MergeStagingToMainOptions> = {
    failed: false,
    values: [],
    switches: {
        cloneTo: MERGE_CLONE_LOCATION,
        originRepo: MERGE_ORIGIN_REPO,
        stagingBranch: MERGE_ORIGIN_STAGING_BRANCH,
        destBranch: MERGE_ORIGIN_MERGE_MAIN_BRANCH,
        test: false,
        noPr: false
    }
};

/**
 * Local script instances of the before and after package json definitions
 */
let _packages: IPackages = {
    src: {},
    dest: {},
};

/**
 * An array of submodules paths created that should be ignored from validation
 */
let _subModules: { url: string, path: string }[] = [];

/**
 * Show the Help for this tool
 */
function showHelp() {
    var scriptParts;
    var scriptName = _theArgs.name;
    if (scriptName.indexOf("\\") !== -1) {
        scriptParts = scriptName.split("\\");
        scriptName = scriptParts[scriptParts.length - 1];
    } else if (scriptName.indexOf("/") !== -1) {
        scriptParts = scriptName.split("/");
        scriptName = scriptParts[scriptParts.length - 1];
    }

    console.log("");
    console.log(scriptName + " [-cloneTo <...>][-originBranch <...>][-originRepo <...>]");
    console.log("".padEnd(99, "-"));
    console.log(formatIndentLines(25, ` -cloneTo <location>    - The working location of where to clone the original repo, defaults to \"${MERGE_CLONE_LOCATION}\"`, 99));
    console.log(formatIndentLines(25, ` -stagingBranch <branch>- Identifies the initial source staging branch to merge from, defaults to \"${MERGE_ORIGIN_STAGING_BRANCH}\"`, 99));
    console.log(formatIndentLines(25, ` -destBranch <branch>   - Identifies final destination branch for the merge, defaults to \"${MERGE_ORIGIN_MERGE_MAIN_BRANCH}\"`, 99));
    console.log(formatIndentLines(25, ` -originRepo <repo>     - This identifies both the initial source and the final destination for the merge, defaults to \"${MERGE_ORIGIN_REPO}\"`, 99));

    terminate(2);
}

/**
 * Initialize this script by creating a new git clone instance of the originRepo
 * @param localGit - The SimpleGit instance to use for the current initial repository
 * @param originRepo - The originRepo in the form <owner>/<reponame>
 * @param destBranch - The origin destination branch to use as the source branch for the local clone
 * @param workingBranch - Identifies the local working branch that will also be pushed to the current users repo
 * @returns A new SimpleGit instance for working with the new local cloned origin repo in the forkDest
 */
 async function _init(localGit: SimpleGit, originRepo: string, destBranch: string, workingBranch: string): Promise<SimpleGit> {
    _currentBranch = (await localGit.branch()).current;
    log("Current Branch: " + _currentBranch);

    addCleanupCallback(async () => {
        let currentBranch = (await localGit.branch()).current;
        if (currentBranch !== _currentBranch) {
            log(`Switching back to ${_currentBranch}`);
            await localGit.checkout(_currentBranch).catch(abort(localGit, `Unable to checkout ${_currentBranch}`));
        }
    });

    _mergeGitRoot = path.resolve(_gitRoot, _theArgs.switches.cloneTo).replace(/\\/g, "/");
    log(`MergeRoot: ${_mergeGitRoot}`);

    const repoTokens = originRepo.split("/");
    if (repoTokens.length !== 2) {
        fail(localGit, `${originRepo} must be in the format <owner>/<repo-name>`);
    }

    const repoName = repoTokens[1];

    let userDetails = await getUser(localGit, _theArgs.switches.destUser || _theArgs.switches.originUser);
    let destUser = userDetails.name;
    if (!destUser || destUser.indexOf(" ") !== -1) {
        destUser = userDetails.user;
    }

    // Make sure the user has forked the repo and if not create one
    await gitHubCreateForkRepo(_gitRoot, originRepo);

    // Now lets go and create a local repo
    let mergeGit = await createLocalBranch(localGit, _mergeGitRoot, originRepo, destBranch, destUser, repoName, workingBranch, userDetails);

    if (!checkPackageName(_mergeGitRoot, SANDBOX_PROJECT_NAME, _mergeGitRoot, true)) {
        fail(mergeGit, "Current repo folder does not appear to be the sandbox");
    }

    let rootPackage = _packages.dest[SANDBOX_PROJECT_NAME].pkg;
    let rootDevDeps = rootPackage["devDependencies"] = ((rootPackage || {})["devDependencies"]) || {};
    let rootScripts = rootPackage["scripts"] = ((rootPackage || {})["scripts"]) || {};

    Object.keys(initDevDependencyVersions).forEach((depKey) => {
        if (!rootDevDeps[depKey]) {
            rootDevDeps[depKey] = initDevDependencyVersions[depKey];
        }
    });

    Object.keys(commonDevDependencyVersions).forEach((depKey) => {
        if (!rootDevDeps[depKey]) {
            rootDevDeps[depKey] = commonDevDependencyVersions[depKey];
        }
    });

    Object.keys(initScripts).forEach((scriptKey) => {
        if (!rootScripts[scriptKey]) {
            rootScripts[scriptKey] = initScripts[scriptKey];
        }
    });

    Object.keys(cleanupScripts).forEach((scriptKey) => {
        if (!rootScripts[scriptKey]) {
            delete rootScripts[scriptKey];
        }
    });


    return mergeGit;
}

/**
 * Helper async function to process the defined packages calling the callback for each
 * definition.
 * @param thePackages - The configured repositories
 * @param cb - the callback function to call with the repo details.
 */
 async function processMergeDetail<T extends IMergeDetail>(thePackages: T[], cb: (details: T) => Promise<any>) {
    for (let lp = 0; lp < thePackages.length; lp++) {
        await cb(thePackages[lp]);
    }
}

async function getStagingRepo(git: SimpleGit, repoName: string, details: IRepoDetails, userDetails: UserDetails): Promise<IStagingRepoDetails> {

    // Get a clone of the source repo and reset to the starting point
    let srcOriginRepoUrl = details.url;
    let srcOriginBranch = details.branch;

    let forkDestOrg =  _mergeGitRoot + "-" + repoName;

    // Now lets go and create a local clone
    log(`Cloning the [${repoName}] source repo ${srcOriginRepoUrl} branch ${srcOriginBranch} to ${forkDestOrg}`);
    await git.clone(srcOriginRepoUrl, forkDestOrg, [ "-b", srcOriginBranch]);

    let stagingGit = createGit(forkDestOrg, "merge.org." + repoName + ".git");
    let checkoutArgs = [
        "--progress",
        "-B", srcOriginBranch
    ];

    if (details.branchStartPoint) {
        // Used for testing the the consistent "merging" over time based on using the configured
        // tags (startPoints) from the original master repo.
        checkoutArgs.push(details.branchStartPoint);
    } else {
        checkoutArgs.push("HEAD")
    }

    await stagingGit.checkout(checkoutArgs);

    // Reset the local branch to the requested HEAD (or mergeStartPoint -- used for testing)
    log("Resetting...");
    await stagingGit.reset(["--hard"]).catch(abort(git, "Failed to hard reset"));

    // Remove any untracked files in this local branch
    log("Cleaning...");
    // The excludes where for local development / branch purposes to ensure local changes where not lost
    await stagingGit.clean([CleanOptions.RECURSIVE, CleanOptions.FORCE], ["-e", "/.vs"]).catch(abort(git, "Failed during clean"));

    // set the git config user.name and user.email for this git instance
    await setUser(stagingGit, userDetails);

    let hashDetails = await stagingGit.show(["-s", details.branchStartPoint ? details.branchStartPoint : "HEAD"]).catch(abort(git, `Failed getting hash details ${details.branchStartPoint ? details.branchStartPoint : "HEAD"}`));

    let commitHash: string = "";
    let commitDetails = /^commit\s+(\w+)/g.exec(hashDetails || "");
    if (commitDetails && commitDetails[1]) {
        commitHash = commitDetails[1];
    }

    let stagingCommitMessage: ICommitDetails = {
        committed: false,
        message: `${repoName} @ [${commitHash.substring(0, 7)}...](${details.url}/commit/${commitHash})\n`
    };

    let stagingDetails: IStagingRepoDetails = {
        git: stagingGit,
        path: forkDestOrg,
        branch: srcOriginBranch,
        commitDetails: {
            committed: false,
            message: stagingCommitMessage.message
        }
    };

    // Move the folders around that we want to "keep"
    await processMergeDetail(foldersToMerge, async (packageDetails: IMergePackageDetail) => {
        let packageName = packageDetails.name;
        let dest = path.join(_mergeGitRoot, packageDetails.destPath);

        log(`Moving [${packageName}] from ${packageDetails.srcPath} into ${dest}`);

        let src = path.join(forkDestOrg, packageDetails.srcPath).replace(/\\/g, "/");
        if (!fs.existsSync(src)) {
            fail(stagingGit, "[" + src + "] - does not exist!");
        }

        if (checkPackageName(src, packageName, packageDetails.destPath)) {

            await movePackage(stagingDetails, packageDetails.srcPath, packageDetails.destPath);

            let destPackageName = transformPackages(packageName);

            let dest = path.join(forkDestOrg, packageDetails.destPath);
            if (!initPackageJson(_packages, dest, destPackageName, packageDetails.destPath, true)) {
                process.exit(11);
            }

            await updateConfigFileRelativePaths(stagingDetails, forkDestOrg, packageDetails.destPath);
            await createPackageRollupConfig(stagingDetails.git, forkDestOrg, packageDetails.destPath, packageDetails.bundleName, packageDetails.bundleNamespace);
            if (!packageDetails.noTests) {
                await createPackageWebpackTestConfig(stagingDetails.git, forkDestOrg, packageDetails.destPath, _mergeGitRoot, packageDetails);
                await createPackageKarmaConfig(stagingDetails.git, forkDestOrg, packageDetails.destPath, _mergeGitRoot, packageDetails);
            }
        } else {
            fail(stagingGit, `[${src}] - Not as expected!`);
        }
    });

    log("Moving Scripts folder");
    await moveFolder(stagingDetails.git, "", forkDestOrg, "auto-merge/js/scripts", "scripts", 0);
    await updateScripts(stagingDetails.git, forkDestOrg);

    // Move the files that we want to "keep"
    log("Moving Files");
    await processMergeDetail(filesToMerge, async (fileDetails) => {
        let dest = path.join(_mergeGitRoot, fileDetails.destPath);

        log(` - (Moving) ${fileDetails.srcPath} -> ${fileDetails.destPath}`);

        let src = path.join(forkDestOrg, fileDetails.srcPath).replace(/\\/g, "/");
        if (!fs.existsSync(src)) {
            if (fileDetails.optional) {
                return;
            }
            
            fail(stagingGit, "[" + src + "] - does not exist!");
        }

        let commitMessage = stagingDetails.commitDetails.message;

        //commitMessage += `\n### Moving ${fileDetails.srcPath} to ${fileDetails.destPath}`;
        await stagingGit.raw([
            "mv",
            "--force",
            "--verbose",
            path.normalize(fileDetails.srcPath),
            path.normalize(fileDetails.destPath)
        ]);

        stagingDetails.commitDetails.message = commitMessage;
    });

    // Update package names
    await processMergeDetail(foldersToMerge, async (packageDetails: IMergePackageDetail) => {
        let packageName = packageDetails.name;
        let dest = path.join(forkDestOrg, packageDetails.destPath);

        log(`Updating [${packageName}] from ${packageDetails.srcPath} into ${dest}`);

        let destPackageName = transformPackages(packageName);
        let srcPackage = _packages.src[packageName];
        let destPackage = _packages.dest[destPackageName];

        if (updatePackageJson(forkDestOrg, dest, srcPackage.pkg, destPackage.pkg, destPackageName, packageDetails)) {
            log("package.json changed -- rewriting...");
            fs.writeFileSync(destPackage.pkgPath, JSON.stringify(destPackage.pkg, null, 2));

            await stagingGit.add(destPackage.pkgPath);
        }

        if (packageDetails.submodules) {
            for (let lp = 0; lp < packageDetails.submodules.length; lp++) {
                let moduleDef = packageDetails.submodules[lp];
                let modulePath = path.join(packageDetails.destPath, moduleDef.path).replace(/\\/g, "/");
                log ("adding submodule " + modulePath + " => " + moduleDef.url);
                await stagingGit.submoduleAdd(moduleDef.url, modulePath);
                _subModules.push({
                    url: moduleDef.url,
                    path: modulePath
                });
            }
        }

        log("Update package name references");
        await updateFilePackageReferences(stagingDetails, forkDestOrg, packageDetails.destPath);
    });

    log ("Cleaning up Files");
    await processMergeDetail(filesToCleanup, async (fileDetails) => {
        let dest = path.join(_mergeGitRoot, fileDetails.destPath).replace(/\\/g, "/");

        if (fs.existsSync(dest)) {
            log(` - (Removing) ${fileDetails.destPath}`);
            try {
                await stagingGit.rm(fileDetails.destPath);
            } catch (e) {
                log(` - (Git rm failed Removing) ${fileDetails.destPath} -  ${e}`);
                fs.rmSync(dest);
            }
        }
    });

    await commitChanges(stagingGit, stagingDetails.commitDetails);

    return stagingDetails;
}

async function updateScripts(git: SimpleGit, forkDestOrg: string) {
    let versionUpdate = path.join(forkDestOrg, "scripts/version-update.js").replace(/\\/g, "/");

    if (!fs.existsSync(versionUpdate)) {
        logError("Missing - " + versionUpdate);
    }

    let versionText = fs.readFileSync(versionUpdate, "utf-8");
    let newVersionText = versionText.replace("// this is autogenerated file,", "// this is autogenerated file for ${pjson.name},");
    if (newVersionText.indexOf("process.exit(0);") === -1) {
        newVersionText += "\n// Returning zero to tell npm that we completed successfully\nprocess.exit(0);\n"
    }

    if (versionText !== newVersionText) {
        fs.writeFileSync(versionUpdate, newVersionText);
        await git.add("scripts/version-update.js");
    }
}

async function updateRushJson(git: SimpleGit, thePath: string) {
    let rushText: string;
    let rushJson: IRushJson = {
        $schema: "https://developer.microsoft.com/json-schemas/rush/v5/rush.schema.json",
        npmVersion: "9.5.1",
        rushVersion: "5.93.1",
        projectFolderMaxDepth: 8,
        projects: []
    };
    let rushJsonPath = path.join(thePath, "rush.json").replace(/\\/g, "/");
    log(`Loading package ${rushJsonPath}`);
    if (fs.existsSync(rushJsonPath)) {
        // Reading file vs using require(packagePath) as some package.json have a trailing "," which doesn't load via require()
        rushText = removeTrailingComma(fs.readFileSync(rushJsonPath, "utf-8"));
        rushJson = JSON.parse(rushText);
    }

    rushJson.rushVersion = (_packages.dest[SANDBOX_PROJECT_NAME].pkg["devDependencies"]["@microsoft/rush"]).replace(/\^/, "");
    
    // Set the rush max project depth
    rushJson.projectFolderMaxDepth = 8;

    Object.keys(_packages.dest).forEach((packageKey) => {
        if (packageKey !== SANDBOX_PROJECT_NAME) {
            let found = false;
            for (let lp = 0; lp < rushJson.projects.length; lp++) {
                let rushProject = rushJson.projects[lp];
                if (rushProject.packageName === packageKey) {
                    rushProject.projectFolder = _packages.dest[packageKey].rPath;
                    found = true;
                    break;
                }
            }

            if (!found) {
                rushJson.projects.push({
                    packageName: packageKey,
                    projectFolder: _packages.dest[packageKey].rPath,
                    shouldPublish: !_packages.dest[packageKey].pkg.private,
                });
            }
        }
    });

    rushJson.projects = rushJson.projects.sort((a, b) => {
        return a.packageName > b.packageName ? 1 : a.packageName < b.packageName ? -1 : 0;
    });

    let newRushText = JSON.stringify(rushJson, null, 2);
    if (newRushText !== rushText) {
        log("rush.json changed -- rewriting...");
        fs.writeFileSync(rushJsonPath, newRushText);

        await git.add(rushJsonPath);
    }
}

function checkPackageName(thePath: string, expectedName: string, packageDestPath: string, isDest?: boolean) {
    let packageBase = isDest ? _packages.dest : _packages.src;
    if (!packageBase[expectedName]) {
        if (!initPackageJson(_packages, thePath, expectedName, packageDestPath, isDest)) {
            return false;
        }
    }

    let packageJson = packageBase[expectedName].pkg;
    if (packageJson && packageJson.name === expectedName) {
        return true;
    }

    logError("Incorrect package [" + packageJson.name + "] !== [" + expectedName + "]");
    delete packageBase[expectedName];

    return false;
}

function shouldProcess(inputFile) {
    inputFile = inputFile.replace(/\\/g, "/");

    if (inputFile.indexOf("/node_modules/") !== -1) {
        return false;
    }

    if (inputFile.endsWith(".d.ts")) {
        return false;
    }

    if (inputFile.endsWith("/version.ts")) {
        return false;
    }

    return inputFile.indexOf("/src/") !== -1 || inputFile.indexOf("/test/") !== -1;
}

function isDropPackage(name: string) {
    if (dropDependencies[name]) {
        return true;
    }

    return false;
}

function updateDependencies(srcPackage: IPackageJson, destPackage: IPackageJson, depKey: string) {
    let changed = false;
    if (srcPackage && srcPackage[depKey]) {
        let rootPackage = _packages.dest[SANDBOX_PROJECT_NAME].pkg;
        let rootDeps = ((rootPackage || {})[depKey]) || {};
        let srcDeps = srcPackage[depKey];
        let destDeps = destPackage[depKey] = destPackage[depKey] || {};
        console.log(" -- " + srcPackage.name + "[" + depKey + "]");
        Object.keys(srcDeps).forEach((key) => {
            let versionDiff = false;
            let destKey = transformPackages(key);
            if (!isDropPackage(key)) {
                let srcVersion = srcDeps[key];
                if (_packages.src[key]) {
                    // rewrite as a fixed version for the sandbox (for optimization with rush reusing the local version)
                    srcVersion = _packages.src[key].pkg.version;
                } 

                if (destKey === key) {
                    // Not a sandbox package
                    let rootVersion = rootDeps[key];
                    if (rootVersion && rootVersion !== srcVersion) {
                        versionDiff = true;
                        srcVersion = rootVersion;
                    } 
                    
                    if(dependencyVersions[key] && srcVersion !== dependencyVersions[key]) {
                        // Always use these versions
                        srcVersion = dependencyVersions[key];
                        versionDiff = true;
                    }
                } else {
                    // A sandbox package
                    if (destDeps[key] && _packages.dest[destKey]) {
                        // A sandbox package with a changed destination
                        delete destDeps[key];
                        changed = true;
                    }
                }

                if (!destDeps[destKey] || destDeps[destKey] !== srcVersion) {
                    if (versionDiff) {
                        logWarn(`   -- ${key}  Using: [${srcVersion}]`);
                    } else {
                        log(`   -- ${key}`);
                    }
                    destDeps[destKey] = srcVersion;
                    changed = true;
                } else {
                    if (versionDiff) {
                        logWarn(`   -- ${key}  Using: [${srcVersion}]`);
                    }
                }
            } else {
                if (destDeps[key] && dropDependencies[key]) {
                    delete destDeps[key];
                    log(`    -- ${key} -- dropped`);
                    changed = true;
                } else {
                    logWarn(`    -- ${key} -- NOT dropped (dest:${!!destDeps[key]}) (drop:${!!dropDependencies[key]})`);
                }
            }
        });
    }

    return changed;
}

function updateRootPackage(packageJson: IPackageJson) {
    Object.keys(rootDevDependencies).forEach((key) => {
        packageJson.devDependencies[key] = rootDevDependencies[key];
    });
}

function sortPackageJson(packageJson: IPackageJson) {
    ["scripts", "dependencies", "devDependencies", "peerDependencies"].forEach((subKey) => {
        let sortTarget = packageJson[subKey];
        if (sortTarget) {
            packageJson[subKey] = Object.keys(sortTarget).sort().reduce((result, key) => {
                result[key] = sortTarget[key];
                return result;
            }, {});
        }
    });
}

function updatePackageJson(basePath: string, dest: string, srcPackage: IPackageJson, destPackage: IPackageJson, name: string, packageDetails: IMergePackageDetail) {
    let changed = false;

    if (srcPackage.version !== destPackage.version) {
        destPackage.version = srcPackage.version;
        changed = true;
    }

    if (destPackage.name !== name) {
        destPackage.name = name;
        changed = true;
    }

    changed = updatePackageJsonScripts(basePath, dest, destPackage, srcPackage, packageDetails) || changed;
    changed = updateDependencies(srcPackage, destPackage, "dependencies") || changed;
    changed = updateDependencies(srcPackage, destPackage, "devDependencies") || changed;
    changed = updateDependencies(srcPackage, destPackage, "peerDependencies") || changed;

    Object.keys(addMissingDevDeps).forEach((key) => {
        if (!destPackage["devDependencies"][key]) {
            destPackage["devDependencies"][key] = addMissingDevDeps[key];
        }
    });

    Object.keys(commonDevDependencyVersions).forEach((key) => {
        if (!destPackage["devDependencies"][key]) {
            destPackage["devDependencies"][key] = commonDevDependencyVersions[key];
        }
    });

    sortPackageJson(destPackage);

    return changed;
}

function updatePackageJsonScripts(basePath: string, dest: string, newPackage: IPackageJson, srcPackage: IPackageJson, packageDetails: IMergePackageDetail) {
    let changed = false;
    let versionUpdate = path.relative(dest, path.join(basePath, "./scripts/version-update.js")).replace(/\\/g, "/");
    let protoGen = path.relative(dest, path.join(basePath, "./scripts/generate-protos.js")).replace(/\\/g, "/");
    log(`Checking for ${path.join(basePath, path.join(packageDetails.destPath, "./tsconfig.all.json")).replace(/\\/g, "/")}`);
    let tsConfigJson =  "tsconfig.all.json";
    if (!fs.existsSync(path.join(basePath, path.join(packageDetails.destPath, "./tsconfig.all.json")).replace(/\\/g, "/"))) {
        tsConfigJson = "";
        if (fs.existsSync(path.join(basePath, path.join(packageDetails.destPath, "./tsconfig.json")).replace(/\\/g, "/"))) {
            tsConfigJson += "tsconfig.json ";
        }

        if (fs.existsSync(path.join(basePath, path.join(packageDetails.destPath, "./tsconfig.esm.json")).replace(/\\/g, "/"))) {
            tsConfigJson += "tsconfig.esm.json ";
        }

        if (fs.existsSync(path.join(basePath, path.join(packageDetails.destPath, "./tsconfig.esnext.json")).replace(/\\/g, "/"))) {
            tsConfigJson += "tsconfig.esnext.json ";
        }
    }

    let hasKarmaBrowserCfg = fs.existsSync(path.join(basePath, path.join(packageDetails.destPath, "./karma.browser.conf.js")).replace(/\\/g, "/"));
    let hasKarmaWorkerCfg = fs.existsSync(path.join(basePath, path.join(packageDetails.destPath, "./karma.worker.conf.js")).replace(/\\/g, "/"));

    let newPackageScripts = {
        "build": "npm run compile && npm run package",
        "rebuild": "npm run clean && npm run build",
        "compile": "npm run lint:fix-quiet && npm run version && tsc --build " + tsConfigJson.trim(),
        "clean": "tsc --build --clean " + tsConfigJson.trim() + "",
        "package": "npx rollup -c ./rollup.config.js --bundleConfigAsCjs",
        "test": "npm run test:node && npm run test:browser && npm run test:webworker",
        "test:node": "nyc ts-mocha -p tsconfig.json 'test/**/*.test.ts' --exclude 'test/browser/**/*.ts'",
        "test:browser": "nyc karma start ./karma.browser.conf.js --single-run",
        "test:webworker": "nyc karma start karma.worker.js --single-run",
        "test:debug": "nyc karma start ./karma.debug.conf.js --wait",
        "lint": "eslint . --ext .ts",
        "lint:fix": "eslint . --ext .ts --fix",
        "lint:fix-quiet": "eslint . --ext .ts --fix --quiet",
        "version": `node ${versionUpdate}`,
        "watch": "npm run version && tsc --build --watch " + tsConfigJson.trim() + ""
    };

    // Automatically add "npm run protos" to the prebuild if present
    if (newPackage.scripts && newPackage.scripts["protos"]) {
        if (!packageDetails.compileScripts || !packageDetails.compileScripts.pre) {
            packageDetails.compileScripts = (packageDetails.compileScripts || {});
            packageDetails.compileScripts.pre = [ "protos" ];
        }
    }

    if (packageDetails.compileScripts) {
        if (packageDetails.compileScripts.pre) {
            let preBuild = "";
            packageDetails.compileScripts.pre.forEach((value) => {
                if (preBuild) {
                    preBuild += " && ";
                }
                preBuild += "npm run " + value;
            });

            newPackageScripts["pre-build"] = preBuild;
            newPackageScripts["compile"] = newPackageScripts["compile"].replace("&& tsc --build ", "&& npm run pre-build && tsc --build ");
        }

        if (packageDetails.compileScripts.post) {
            let postBuild = "";
            packageDetails.compileScripts.post.forEach((value) => {
                if (postBuild) {
                    postBuild += " && ";
                }
                postBuild += "npm run " + value;
            });

            newPackageScripts["post-build"] = postBuild;
            newPackageScripts["compile"] = (newPackageScripts["compile"] + " && npm run post-build");
        }
    }

    if (!hasKarmaBrowserCfg && fs.existsSync(path.join(basePath, path.join(packageDetails.destPath, "./karma.conf.js")).replace(/\\/g, "/"))) {
        newPackageScripts["test:browser"] = "nyc karma start ./karma.conf.js --single-run";
        hasKarmaBrowserCfg = true;
    }


    if (!newPackage.scripts) {
        fail(null, JSON.stringify(newPackage));
    }

    if (newPackage.scripts["protos:generate"]) {
        newPackage.scripts["protos:generate"] = `node ${protoGen}`;
    }

    Object.keys(newPackageScripts).forEach((script) => {
        if (!newPackage.scripts[script] || newPackage.scripts[script] !== newPackageScripts[script]) {
            let addTarget = true;
            if (script.startsWith("test")) {
                addTarget = !packageDetails.noTests;

                if (script.startsWith("test:browser")) {
                    addTarget = hasKarmaBrowserCfg && !packageDetails.noBrowserTests;
                }

                if (script.startsWith("test:webworker")) {
                    addTarget = hasKarmaWorkerCfg && !packageDetails.noWorkerTests;
                }

                if (script.startsWith("test:node")) {
                    addTarget = !packageDetails.noNodeTests;
                }
            } else if (script.startsWith("build") || script.startsWith("compile") || script.startsWith("clean")) {
                addTarget = !packageDetails.noBuild;
            } else if (script.startsWith("lint")) {
                addTarget = !packageDetails.noLint;
            } else if (script.startsWith("version")) {
                addTarget = !packageDetails.noVersion;
            }

            newPackage.scripts[script] = addTarget  ? newPackageScripts[script] : "";
            changed = true;
        }
    });

    ["precompile", "prewatch"].forEach((script) => {
        if (newPackage.scripts[script]) {
            delete newPackage.scripts[script];
            changed = true;
        }
    });

    if (packageDetails.scripts) {
        Object.keys(packageDetails.scripts).forEach((script) => {
            newPackage.scripts[script] = packageDetails.scripts[script];
            changed = true;
        });
    }

    return changed;
}

async function updateFilePackageReferences(stagingDetails: IStagingRepoDetails, baseFolder: string, destPath: string) {

    log(` -- Checking ${baseFolder + "/" + destPath}`);
    if (fs.existsSync(baseFolder + "/" + destPath)) {
        let dirFiles = fs.readdirSync(baseFolder + "/" + destPath);
        for (let lp = 0; lp < dirFiles.length; lp++) {
            let theFilename = (destPath ? (destPath + (!destPath.endsWith("/") ? "/": "")) : "") + dirFiles[lp];
            let newFromStats = fs.statSync(baseFolder + "/" + theFilename);
            if (newFromStats.isFile()) {
                let content = fs.readFileSync(baseFolder + "/" + theFilename, "utf-8");
                let newContent = transformContent(content);
                if (content && newContent && content != newContent) {
                    log(` -- ${theFilename} changed -- rewriting...`);
                    fs.writeFileSync(baseFolder + "/" + theFilename, newContent);
                    await stagingDetails.git.add(theFilename);
                }
            } else if (newFromStats.isDirectory() && !isIgnoreFolder(null, dirFiles[lp], false)) {
                await updateFilePackageReferences(stagingDetails, baseFolder, theFilename);
            }
        }
    }
}

async function updateConfigFileRelativePaths(stagingDetails: IStagingRepoDetails, basePath: string, destPath: string) {
    let dest = path.join(basePath, destPath).replace(/\\/g, "/");
    let relativePath = path.relative(dest, path.join(basePath, "$$$temp$$$")).replace(/\\/g, "/").replace("/$$$temp$$$", "/");

    const baseEsLintConfig = path.relative(dest, path.join(basePath, "eslint.base.js")).replace(/\\/g, "/");

    const files = fs.readdirSync(dest);
    log(`Updating relative paths: ${files.length} file(s) in ${dest}`);
    for (let lp = 0; lp < files.length; lp++) {
        let name = files[lp];
        let theFilename = path.join(dest, name).replace(/\\/g, "/");
        let content: string;
        let newContent: string;
        if (name.startsWith("tsconfig.")) {
            // Update paths to base tsconfigs
            content = fs.readFileSync(theFilename, "utf-8");
            newContent = content.replace(/extends['"]:\s*['"]((.*)\/(tsconfig.*[^\s,\'\"]*))['"]/gm, function(match, fullName, path, filename) {
                let result = match;
                if (filename.startsWith("tsconfig")) {
                    log(` -- replacing ${fullName} => ${relativePath + filename}`);
                    result = result.replace(fullName, relativePath + filename);
                }

                return result;
            });

            // remove references as rush references care of this
            if (newContent.indexOf("\"references\"") !== -1) {
                var contextText = removeTrailingComma(newContent);
                try {
                    let tsConfigJson = JSON.parse(contextText);
                    let references = tsConfigJson.references;
                    if (references) {
                        let newReferences = [];
                        for (let lp = 0; lp < references.length; lp++) {
                            let theReference = references[lp];
                            if (theReference.path.startsWith("./tsconfig.")) {
                                newReferences.push(theReference);
                            }
                        }
    
                        if (newReferences.length > 0) {
                            tsConfigJson.references = newReferences;
                        } else {
                            delete tsConfigJson.references;
                        }
    
                        newContent = JSON.stringify(tsConfigJson, null, 2);
                    }
                } catch (e) {
                    // Do nothing
                }
            }

        } else if (name === ".eslintrc.js") {
            // update paths to base eslint.config.js to eslint.base.js (contrib)
            content = fs.readFileSync(theFilename, "utf-8");
            newContent = content.replace(/require\(['"](.*eslint\.config\.js)['"]\)/gm, function(match, group) {
                log(` -- replacing ${group} => ${baseEsLintConfig}`);
                return match.replace(group, baseEsLintConfig);
            });
            // update paths to base eslint.base.js
            newContent = newContent.replace(/require\(['"](.*eslint\.base\.js)['"]\)/gm, function(match, group) {
                log(` -- replacing ${group} => ${baseEsLintConfig}`);
                return match.replace(group, baseEsLintConfig);
            });
        } else if (name.startsWith("karma")) {
            // update paths to base karma configs
            content = fs.readFileSync(theFilename, "utf-8");
            newContent = content.replace(/require\(['"]((.*)\/(karma.*|webpack\.node.*))['"]\)/gm, function(match, fullName, path, filename) {
                let result = match;
                log(` -- replacing ${fullName} => ${relativePath + filename}`);
                result = result.replace(fullName, relativePath + filename);

                return result;
            });
        }

        if (content && newContent && content != newContent) {
            log(` -- ${theFilename} changed -- rewriting...`);
            fs.writeFileSync(theFilename, newContent);
            await stagingDetails.git.add(theFilename);
        }
    }
}

async function cleanupMergeFiles(mergeGit: SimpleGit) {
    await processMergeDetail(mergeFilesToCleanup, async (fileDetails) => {
        let dest = path.join(_mergeGitRoot, fileDetails.destPath).replace(/\\/g, "/");

        if (fs.existsSync(dest)) {
            log(` - (Removing) ${fileDetails.destPath}`);
            try {
                await mergeGit.rm(fileDetails.destPath);
            } catch (e) {
                log(` - (Git rm failed Removing) ${fileDetails.destPath} - ${e}`);
                fs.rmSync(dest);
            }
        }
    });
}

async function mergeStagingToMaster(mergeGit: SimpleGit, stagingDetails: IStagingRepoDetails) {
    let mergeCommitMessage: ICommitDetails = {
        committed: false,
        message: "Merge Staged changes to main"
    };

    log(`Merging staging`)
    let commitPerformed = false;
    await mergeGit.merge([
        "--no-commit",
        "-X", "theirs",
        "--progress",
        "--no-ff",
        "--no-edit",
        "staging/" + stagingDetails.branch]).catch(async (reason) => {
            log (`Remove cleanup merge files in ${_mergeGitRoot} first`);
            await cleanupMergeFiles(mergeGit);
            commitPerformed = await resolveConflictsToTheirs(mergeGit, _mergeGitRoot, mergeCommitMessage, false);
        });

    log("-----------------------------------------------");
    log("Now check for merge issues and fix from staging");
    log("-----------------------------------------------");
    mergeCommitMessage.message += `\nIdentifying and fixing merge issues from staged repos`

    function _isVerifyIgnore(repoName: string, destFolder: string, source: string, ignoreOtherRepoFolders: boolean): boolean {
        if (source === "." || source === ".." || source === ".git" || source === ".vs" || source === "node_modules" || source === "auto-merge") {
            // Always ignore these
            return true;
        }

        let destPath = path.join(destFolder, source).replace(/\\/g, "/");
        let isSubmodule = false;
        _subModules.forEach((subPath) => {
            if (destPath.indexOf(subPath.path) !== -1) {
                log(` - Submodule ignore: ${subPath}`);
                isSubmodule = true;
            }
        });

        if (isSubmodule) {
            return true;
        }

        return false;
    }

    // Validate and fixup any bad merges that may have occurred -- make sure the source and new merged repo contain the same files
    await checkFixBadMerges(mergeGit, _mergeGitRoot, _isVerifyIgnore, stagingDetails.branch, stagingDetails.path + "/pkgs", _mergeGitRoot + "/pkgs", mergeCommitMessage, 0);

    for (let lp = 0; lp < fixBadMergeRootFiles.length; lp++) {
        let mergeFileChk = fixBadMergeRootFiles[lp];

        if (validateFile(_mergeGitRoot, stagingDetails.path + "/" + mergeFileChk,  _mergeGitRoot + "/" + mergeFileChk, mergeCommitMessage)) {

            await mergeGit.raw([
                "add",
                "-f",
                _mergeGitRoot + "/" + mergeFileChk]);
        }
    }

    log ("Resetting up submodules");
    for (let lp = 0; lp < _subModules.length; lp++) {
        try {
            log ("adding submodule " + _subModules[lp].path + " => " + _subModules[lp].url);
            await mergeGit.submoduleAdd(_subModules[lp].url, _subModules[lp].path);
        } catch (e) {
            if (e.message.indexOf("already exists") === -1) {
                throw e;
            }
        }
    }

    // Update the root package json
    if (!checkPackageName(_mergeGitRoot, SANDBOX_PROJECT_NAME, _mergeGitRoot, true)) {
        fail(mergeGit, "Current repo folder does not appear to be the sandbox");
    }

    log (`Cleaning up merge files in ${_mergeGitRoot}`);
    await cleanupMergeFiles(mergeGit);

    let rootPackage = _packages.dest[SANDBOX_PROJECT_NAME];
    updateRootPackage(rootPackage.pkg);
    sortPackageJson(rootPackage.pkg);

    let newRushText = JSON.stringify(rootPackage.pkg, null, 2);
    if (newRushText !== rootPackage.pkgText) {
        log("package.json changed -- rewriting...");
        fs.writeFileSync(rootPackage.pkgPath, newRushText);

        await mergeGit.add(rootPackage.pkgPath);
    }

    await updateRushJson(mergeGit, _mergeGitRoot);

    let shrinkWrapFile = await rushUpdateShrinkwrap(_mergeGitRoot);
    if (shrinkWrapFile) {
        await mergeGit.add(shrinkWrapFile);
    }

    let commandLineJson = rushUpdateCommandLine(_mergeGitRoot, mergeRushCommandLine);
    if (commandLineJson) {
        await mergeGit.add(commandLineJson);
    }

    mergeCommitMessage.committed = await commitChanges(mergeGit, mergeCommitMessage) || commitPerformed;

    return mergeCommitMessage;
}

export async function movePackage(stagingDetails: IStagingRepoDetails, srcFolder: string, destFolder: string) {

    let theLocalDestPath = path.resolve(path.join(stagingDetails.path, destFolder)).replace(/\\/g, "/") + "/";
    let theGitDestFolder = destFolder;

    if (srcFolder.length === 0) {
        // Don't log this if we are in recursively moving
        log(`Moving Package to ${theGitDestFolder}; Local dest path: ${theLocalDestPath}`);
    }

    const files = fs.readdirSync(stagingDetails.path + "/" + srcFolder);
    log(`${files.length} file(s) found in ${stagingDetails.path + "/" + srcFolder} to move`);
    if (!fs.existsSync(theLocalDestPath)) {
        fs.mkdirSync(theLocalDestPath, { recursive: true });
    }

    if (files.length > 0) {
        let commitMessage = stagingDetails.commitDetails.message;

        commitMessage += `\n### Moving package from ${srcFolder ? srcFolder : "./"} to ${theGitDestFolder}`
        commitMessage = await moveFolder(stagingDetails.git, commitMessage, stagingDetails.path, srcFolder, theGitDestFolder, 0);

        stagingDetails.commitDetails.message = commitMessage;
    } else {
        log(` - No files found in ${stagingDetails.path + "/" + srcFolder}`);
    }
}

//---------------------------------------------------------------------------------------------------------------
// Main Script execution
//---------------------------------------------------------------------------------------------------------------

if (!_gitRoot) {
    console.error("Unable to locate the repo root");
    terminate(2);
}

addCleanupCallback(async (git: SimpleGit)  => {
    //await removeTemporaryRemotes(git, reposToSyncAndMerge);
});

_theArgs = parseArgs({
    switches: {
        cloneTo: true,
        stagingBranch: true,
        destBranch: true,
        originRepo: true,
        test: false,
        noPr: false,
        originUser: true,
        destUser: true
    },
    defaults: {
        values: _theArgs.values,
        switches: _theArgs.switches
    }
});

if (_theArgs.switches.showHelp) {
    showHelp();
}

if (_theArgs.failed) {
    fail(null, `Failed parsing arguments - ${JSON.stringify(_theArgs.errors, null, 4)}`);
}

const localGit = createGit(_gitRoot, "local.git");
log(`CWD: ${process.cwd()}; gitRoot: ${_gitRoot}`);

localGit.checkIsRepo().then(async (isRepo) => {
    if (isRepo) {
        // Lets go and process the repos
        log("We have a repo");
        const originRepo = _theArgs.switches.originRepo;
        const originRepoUrl = "https://github.com/" + originRepo;
        const stagingBranch = _theArgs.switches.stagingBranch;
        const stagingStartPoint = _theArgs.switches.stagingStartPoint;
        const destBranch = _theArgs.switches.destBranch;
        let createPr = !_theArgs.switches.noPr;
        let prTitle = "[AutoMerge][Main] Merging staged change(s) to main ";
        let prBody = "";
        let prRequired = false;

        if (_theArgs.switches.test ) {
            //createPr = false;
            _theArgs.switches.cloneTo = "../" + _theArgs.switches.cloneTo;
            prTitle = "[Test]" + prTitle;
        }

        let userDetails = await getUser(localGit, _theArgs.switches.originUser);

        let workingBranch = userDetails.name + "/merge-" + (destBranch.replace(/\//g, "-"));
        if (userDetails.name.indexOf(" ") !== -1) {
            workingBranch = userDetails.user + "/merge-" + (destBranch.replace(/\//g, "-"));
        }

        const mergeGit = await _init(localGit, originRepo, destBranch, workingBranch);

        let existingPr = await checkPrExists(mergeGit, _mergeGitRoot, originRepoUrl, destBranch);
        if (existingPr && createPr) {
            await fail(localGit, `A PR already exists -- please commit or close the previous PR`)
        }

        console.log("Merge all Repos");

        // let mergeCommitDetails: ICommitDetails = { };

        let stagingDetails = await getStagingRepo(mergeGit, "staging", {
            url: originRepoUrl,
            branch: stagingBranch,
            branchStartPoint: stagingStartPoint
        }, userDetails);

        if (stagingDetails.commitDetails.committed) {
            if (prBody) {
                prBody += "\n";
            }

            prBody += stagingDetails.commitDetails.message;
        }

        // Add the new source repo as the remote
        log(`Adding Remote staging => ${stagingDetails.path} ${stagingDetails.branch}`)
        await addRemoteAndFetch(mergeGit, "staging", {
            url: stagingDetails.path,
            branch: stagingDetails.branch
        });

        // Merge and commit any required changes
        let mergeCommitMessage = await mergeStagingToMaster(mergeGit, stagingDetails);
        if (mergeCommitMessage.committed) {
            if (prBody) {
                prBody += "\n";
            }

            prBody += mergeCommitMessage.message;
            prRequired = true;
        }

        if (prRequired && createPr && await pushToBranch(mergeGit)) {
            await createPullRequest(mergeGit, _mergeGitRoot, prTitle, prBody, originRepo, destBranch, _theArgs.switches.test);

            try {
                // Attempt to push the tags to the origin
                await mergeGit.pushTags("origin");
            } catch (e) {
                log(`Unable to push tags to origin - ${dumpObj(e)}`);
            }

            try {
                // Attempt to push the tags to the originRepo
                await mergeGit.pushTags("upstream");
            } catch (e) {
                log(`Unable to push tags to upstream - ${dumpObj(e)}`);
            }
        }

        await doCleanup(mergeGit);
    } else {
        await fail(localGit, "We are not running inside a repo");
    }
}, async (reason) => {
    await fail(localGit, "Unable to check if this is a valid repo - " + JSON.stringify(reason));
});
