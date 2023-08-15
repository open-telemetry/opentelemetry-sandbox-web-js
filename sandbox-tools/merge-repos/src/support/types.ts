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

export declare type CleanupFunc = (git: SimpleGit) => Promise<any>;

/**
 * Identifies the source repo details
 */
 export interface IRepoDetails {
    /**
     * The full github repo to use as the source
     */
    url : string;

    /**
     * The branch from the source repo to use
     */
    branch: string;

    /**
     * [Optional] Identifies the point on the source branch to be merged into the auto-merge branch.
     * Defaults to undefined and therefore the HEAD of the specified branch
     */
    branchStartPoint?: string;

    /**
     * The prefix to apply to remote tags when merging into the destination repo.
     * If not defined defaults to the <repo key name>
     */
    tagPrefix?: string;

    /**
     * The destination in the final "Merged" repo where this repo should be relocated to.
     * If not defined defaults to MERGE_DEST_BASE_FOLDER + "/" + <repo key name>
     */
    destFolder?: string;

    /**
     * The name to use for the local branch during merge operations (not pushed to the repo),
     * if not defined defaults to BRANCH_PREFIX + "/" + <repo key name>
     */
    mergeBranchName?: string;

    /**
     * [Optional] Identifies the point to for the branch to be merged against.
     * Defaults to undefined and therefore the HEAD of the specified branch
     */
    mergeStartPoint?: string;
}

/**
 * Identifies the collection of repos' to be merged and sync'd
 */
export interface IRepoSyncDetails {
    /**
     * Identifies the repo to be merged / sync'd, the value of the `key` is used as the local
     * remote name (via `git add remote <key>`) and therefore should NOT be previously used values
     * like `origin` and `upstream`.
     */
    [key: string]: IRepoDetails
}

export interface IMergeDetail {
    /**
     * Identifies the location in the staging repo
     */
    srcPath?: string;

    /**
     * Identifies the location in the main repo where to merge this package
     */
    destPath: string;

    /**
     * Is moving this file optional
     */
    optional?: boolean;
}

export interface ISubModuleDef {
    path: string,
    url: string
}

export interface IMergePackageDetail extends IMergeDetail {
    /**
     * Identifies the package name.
     * eg. @opentelemetry/api; @opentelemetry/resources
     */
    name: string;

    /**
     * The filename of the generated bundle
     */
    bundleName: string;

    /**
     * The namespace to use for the generated bundle
     */
    bundleNamespace: string;

    /**
     * Identifies that this package doesn't have any tests and therefore should not add test targets or config
     */
    noTests?: boolean;

    /**
     * Identifies that this package doesn't have any browser tests and therefore should not add browser test targets or config
     */
    noBrowserTests?: boolean;

    /**
     * Identifies that this package doesn't have any worker tests and therefore should not add worker test targets or config
     */
    noWorkerTests?: boolean;

    /**
     * Identifies that this package doesn't have any node tests and therefore should not add node test targets or config
     */
    noNodeTests?: boolean;

    /**
     * Identifies that this package doesn't have any build steps
     */
    noBuild?: boolean;

    /**
     * Identifies that this package doesn't support any linting and therefore should not add eslint targets or config
     */
    noLint?: boolean;

    /**
     * Identifies that this package doesn't support the version.ts and therefore should not add the automatic version targets or config
     */
    noVersion?: boolean;

    /**
     * Additional build targets that should be added to the package.json build step
     */
    compileScripts?: {
        /**
         * The script names to add before the tsc compile
         */
        pre?: string[],

        /**
         * The script names to add after the tsc compile but before packaging
         */
        post?: string[]
    },

    /**
     * Optional additional scripts and overrides, applied after the standard conversions
     */
    scripts?: { [key: string]: string },

    /**
     * Optionally defines any submodules that this package requires, each sub-module will be located within a sub-folder of the project
     */
    submodules?: ISubModuleDef[],
}

/**
 * Simple package.json definition
 */
export interface IPackageJson {
    name: string,
    private?: boolean,
    version: string,
    description: string,
    keywords?: string[],
    author?: string,
    license?: string,
    repository?: string,
    homepage?: string,
    scripts?: { [key: string]: string },
    dependencies?: { [key: string]: string },
    devDependencies?: { [key: string]: string },
    peerDependencies?: { [key: string]: string },
}

/**
 * Holds the loaded details about package.json instances
 */
export interface IPackageJsonDetail {
    isNew?: boolean;

    /**
     * The root path for the project
     */
    path: string,

    /**
     * The relative path for the project
     */
    rPath: string,

     /**
     * The path to the package.json
     */
    pkgPath: string,

    /**
     * Holds the loaded package.json
     */
    pkg: IPackageJson,

    /**
     * The original package.json text
     */
    pkgText: string
}

/**
 * Defines the structure for current `src` and changed `dest` package.json instances
 */
export interface IPackages {
    src: { [key: string]: IPackageJsonDetail },
    dest: { [key: string]: IPackageJsonDetail }
}



/**
 * Simplified rush.json project definition
 */
export interface IRushProject {
    packageName: string,
    projectFolder: string,
    shouldPublish: boolean
}

/**
 * Simplified rush.json definition
 */
export interface IRushJson {
    $schema: string,
    npmVersion: string,
    rushVersion: string,
    projectFolderMaxDepth: number,
    projects: IRushProject[]
}