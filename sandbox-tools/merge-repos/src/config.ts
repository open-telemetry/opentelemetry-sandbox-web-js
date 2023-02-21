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

import { IMergeDetail, IMergePackageDetail, IRepoSyncDetails } from "./support/types";

export const LICENSE_HEADER = "/*!\n" +
" * Copyright The OpenTelemetry Authors\n" +
" *\n" +
" * Licensed under the Apache License, Version 2.0 (the \"License\");\n" +
" * you may not use this file except in compliance with the License.\n" +
" * You may obtain a copy of the License at\n" +
" *\n" +
" *      http://www.apache.org/licenses/LICENSE-2.0\n" +
" *\n" +
" * Unless required by applicable law or agreed to in writing, software\n" +
" * distributed under the License is distributed on an \"AS IS\" BASIS,\n" +
" * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n" +
" * See the License for the specific language governing permissions and\n" +
" * limitations under the License.\n" +
"*/\n\n";

/**
 * This identifies both the initial source and the final destination for the merge.
 * ie. The created PR will be created to merge back into this repo
 */
export const MERGE_ORIGIN_REPO = "open-telemetry/opentelemetry-sandbox-web-js";

/**
 * Identifies both the initial source and final destination branch for the merge
 * ie. The created PR will be created to merger back into this branch for the Origin Repo
 */
export const MERGE_ORIGIN_MERGE_MAIN_BRANCH = "main";

/**
 * Identifies both the initial source and final destination branch for the merge
 * ie. The created PR will be created to merger back into this branch for the Origin Repo
 */
export const MERGE_ORIGIN_STAGING_BRANCH = "auto-merge/repo-staging";

/**
 * Identifies the working repo to use as the destination fork
 */
export const MERGE_FORK_REPO = "open-telemetry/opentelemetry-sandbox-web-js";

/**
 * The local relative location to generate the local fork and merge repos
 */
export const MERGE_CLONE_LOCATION = ".auto-merge/temp";

/**
 * The base folder where all of the repositories being merged will be located into.
 */
export const MERGE_DEST_BASE_FOLDER = "auto-merge";

/**
 * The prefix to apply to all local branches
 */
export const BRANCH_PREFIX = "auto-merge";

/**
 * When Committing to the local branches add this as the prefix
 */
export const COMMIT_PREFIX = "[AutoMerge]";

/**
 * The main project name
 */
export const SANDBOX_PROJECT_NAME = "opentelemetry-sandbox-web-js";

/**
 * Identifies the master source repositories to me merged into the `MERGE_DEST_BASE_FOLDER`
 * of the destination repo `MERGE_ORIGIN_STAGING_BRANCH`
 * The contrib repo if needed to be merged, just needs to be added here
 */
export const reposToSyncAndMerge: IRepoSyncDetails = {
    "otel-js": {
        url: "https://github.com/open-telemetry/opentelemetry-js",
        branch: "main",
        //mergeStartPoint: "HEAD",    // Used for local testing to validate periodic execution
        //branchStartPoint: "e91cac503c0bab95b429ff3c4b23249653882054",
        destFolder: MERGE_DEST_BASE_FOLDER + "/js"
    },
    "otel-js-contrib": {
        url: "https://github.com/open-telemetry/opentelemetry-js-contrib",
        branch: "main",
        //mergeStartPoint: "HEAD",    // Used for local testing to validate periodic execution
        //branchStartPoint: "35226602b92a7587f16a1eb959e4f3b3948f6e9d",
        destFolder: MERGE_DEST_BASE_FOLDER + "/contrib"
    }
};

/**
 * Identifies the web packages that should be merged from the staging branch to main and the 
 * location that the package should be moved to.
 */
export const foldersToMerge: IMergePackageDetail[] = [
    { name: "@opentelemetry/api", destPath: "pkgs/api/", srcPath: "auto-merge/js/api", bundleName: "otel-sndbx.api", bundleNamespace: "opentelemetry.sandbox.web.api" },
    { name: "@opentelemetry/semantic-conventions", destPath: "pkgs/semantic-conventions/", srcPath: "auto-merge/js/packages/opentelemetry-semantic-conventions/", bundleName: "otel-sndbx.semantic-conventions", bundleNamespace: "opentelemetry.sandbox.web.semantic-conventions", noTests: true },
    { name: "@opentelemetry/core", destPath: "pkgs/core/", srcPath: "auto-merge/js/packages/opentelemetry-core/", bundleName: "otel-sndbx.core", bundleNamespace: "opentelemetry.sandbox.web.core" }
    // { name: "@opentelemetry/resources", destPath: "pkgs/resources/", srcPath: "auto-merge/js/packages/opentelemetry-resources/", bundleName: "otel-sndbx.resources", bundleNamespace: "opentelemetry.sandbox.web.resources" },
    // { name: "@opentelemetry/context-zone", destPath: "pkgs/context/zone/", srcPath: "auto-merge/js/packages/opentelemetry-context-zone/", bundleName: "otel-sndbx.context-zone", bundleNamespace: "opentelemetry.sandbox.web.context-zone", noTests: true },
    // { name: "@opentelemetry/context-zone-peer-dep", destPath: "pkgs/context/zone-peer-dep/", srcPath: "auto-merge/js/packages/opentelemetry-context-zone-peer-dep/", bundleName: "otel-sndbx.context-zone-peer-dep", bundleNamespace: "opentelemetry.sandbox.web.context-zone-peer-dep", noWorkerTests: true, noNodeTests: true },
    // //{ name: "@opentelemetry/context-async-hooks", destPath: "pkgs/context/async-hooks/", srcPath: "auto-merge/js/packages/opentelemetry-context-async-hooks/", bundleName: "otel-sndbx.context-zone-async-hooks", bundleNamespace: "opentelemetry.sandbox.web.context-zone-async-hooks" },
    // { name: "@opentelemetry/propagator-b3", destPath: "pkgs/propagators/b3/", srcPath: "auto-merge/js/packages/opentelemetry-propagator-b3/", bundleName: "otel-sndbx.propagator-b3", bundleNamespace: "opentelemetry.sandbox.web.propagator-b3" },
    // { name: "@opentelemetry/sdk-trace-base", destPath: "pkgs/sdk/trace-base/", srcPath: "auto-merge/js/packages/opentelemetry-sdk-trace-base/", bundleName: "otel-sndbx.sdk-trace-base", bundleNamespace: "opentelemetry.sandbox.web.sdk-trace-base" },
    // { name: "@opentelemetry/sdk-trace-web", destPath: "pkgs/sdk/trace-web/", srcPath: "auto-merge/js/packages/opentelemetry-sdk-trace-web/", bundleName: "otel-sndbx.sdk-trace-web", bundleNamespace: "opentelemetry.sandbox.web.sdk-trace-web", noWorkerTests: true, noNodeTests: true },
    // { name: "@opentelemetry/sdk-metrics", destPath: "pkgs/sdk/metrics/", srcPath: "auto-merge/js/packages/sdk-metrics/", bundleName: "otel-sndbx.sdk-metrics", bundleNamespace: "opentelemetry.sandbox.web.sdk-metrics" },
    // // { name: "@opentelemetry/exporter-trace-otlp-grpc",  destPath: "pkgs/exporters/otlp/trace-grpc/",   srcPath: "auto-merge/js/experimental/packages/exporter-trace-otlp-grpc/" },
    // // { name: "@opentelemetry/exporter-jaeger",  destPath: "pkgs/exporters/jaeger/",   srcPath: "auto-merge/js/packages/opentelemetry-exporter-jaeger/" },
    // // { name: "@opentelemetry/exporter-zipkin",  destPath: "pkgs/exporters/zipkin/",   srcPath: "auto-merge/js/packages/opentelemetry-exporter-zipkin/" },
    // { name: "@opentelemetry/instrumentation", destPath: "pkgs/instrumentation/", srcPath: "auto-merge/js/experimental/packages/opentelemetry-instrumentation/", bundleName: "otel-sndbx.instrumentation", bundleNamespace: "opentelemetry.sandbox.web.instrumentation" },
    // { name: "@opentelemetry/instrumentation-document-load", destPath: "pkgs/plugins/web/document-load/", srcPath: "auto-merge/contrib/plugins/web/opentelemetry-instrumentation-document-load/", bundleName: "otel-sndbx.instr-doc-load", bundleNamespace: "opentelemetry.sandbox.plugin.web.instrumentation-document-load", noWorkerTests: true },
    // { name: "@opentelemetry/instrumentation-user-interaction", destPath: "pkgs/plugins/web/user-interaction/", srcPath: "auto-merge/contrib/plugins/web/opentelemetry-instrumentation-user-interaction/", bundleName: "otel-sndbx.instr-user-interaction", bundleNamespace: "opentelemetry.sandbox.plugin.web.instrumentation-user-interaction", noWorkerTests: true },
    // { name: "@opentelemetry/instrumentation-long-task", destPath: "pkgs/plugins/web/long-task/", srcPath: "auto-merge/contrib/plugins/web/opentelemetry-instrumentation-long-task/", bundleName: "otel-sndbx.instr-long-task", bundleNamespace: "opentelemetry.sandbox.plugin.web.instrumentation-long-task", noWorkerTests: true }
];

/**
 * Merge these files to the destination location
 */
export const filesToMerge: IMergeDetail[] = [
    { srcPath: "auto-merge/js/.markdownlint.json",          destPath: ".markdownlint.json" },
    { srcPath: "auto-merge/js/eslint.config.js",            destPath: "eslint.config.js" },
    { srcPath: "auto-merge/js/karma.base.js",               destPath: "karma.base.js" },
    { srcPath: "auto-merge/js/karma.webpack.js",            destPath: "karma.webpack.js" },
    { srcPath: "auto-merge/js/karma.worker.js",             destPath: "karma.worker.js" },
    { srcPath: "auto-merge/js/tsconfig.base.es5.json",      destPath: "tsconfig.base.es5.json",     optional: true  },
    { srcPath: "auto-merge/js/tsconfig.base.esm.json",      destPath: "tsconfig.base.esm.json",     optional: true  },
    { srcPath: "auto-merge/js/tsconfig.base.esnext.json",   destPath: "tsconfig.base.esnext.json" },
    { srcPath: "auto-merge/js/tsconfig.base.json",          destPath: "tsconfig.base.json" },
    { srcPath: "auto-merge/js/tsconfig.es5.json",           destPath: "tsconfig.es5.json",          optional: true },
    { srcPath: "auto-merge/js/tsconfig.esm.json",           destPath: "tsconfig.esm.json",          optional: true },
    { srcPath: "auto-merge/js/tsconfig.esnext.json",        destPath: "tsconfig.esnext.json",       optional: true },
    { srcPath: "auto-merge/js/tsconfig.json",               destPath: "tsconfig.json" },
    { srcPath: "auto-merge/js/webpack.node-polyfills.js",   destPath: "webpack.node-polyfills.js" },
    { srcPath: "auto-merge/js/prettier.config.js",          destPath: "prettier.config.js" }
];

/**
 * Enforce these versions when specified (required or dev)
 */
export let dependencyVersions = {
    "@types/mocha": "^10.0.0",
    "@types/node": "^18.6.5",
    "@types/sinon": "^10.0.13",
    "@types/webpack-env": "1.16.3",
    "@types/jquery": "^3.5.14",
    "@typescript-eslint/eslint-plugin": "5.3.1",
    "@typescript-eslint/parser": "5.3.1",
    "zone-js": "^0.11.4"
};

/**
 * Add these missing dev dependencies
 */
export let addMissingDevDeps = {
    "@types/mocha": "^10.0.0",
    "@types/node": "^18.6.5",
    "@types/sinon": "^10.0.13",
    "@types/webpack-env": "1.16.3",
    "@types/jquery": "^3.5.14",
    "karma-mocha-webworker": "1.3.0",
    "@typescript-eslint/eslint-plugin": "5.3.1",
    "@typescript-eslint/parser": "5.3.1",
    "eslint": "7.32.0",
    "eslint-plugin-header": "3.1.1",
    "eslint-plugin-node": "11.1.0",
    "typedoc": "0.22.18",
    "typedoc-plugin-missing-exports": "1.0.0",
    "typedoc-plugin-resolve-crossmodule-references": "0.2.2"
};

/**
 * Remove these dependencies (required or dev)
 */
export let dropDependencies = {
    "lerna": ""
};

/**
 * Add these scripts to the root package.json
 */
export let initScripts = {
    "build": "rush rebuild --verbose",
    "rebuild": "npm run build",
    "compile": "npm run build",
    "postinstall": "rush update",
    "test": "rush test --verbose",
    "lint": "rush lint --verbose",
    "lint:fix": "rush lint:fix --verbose",
    "rush-update": "rush update --recheck --purge --full",
    "rush-purge": "rush purge",
    "fullClean": "git clean -xdf && npm install && rush update --recheck --full",
    "fullCleanBuild": "npm run fullClean && npm run rebuild"
};

/**
 * Remove these scripts if present
 */
export let cleanupScripts = {

};

/**
 * Add these dev depencencies to the root package.json
 */
export let initDevDependencyVersions = {
    "@microsoft/rush": "5.86.0",
    "markdownlint-cli": "^0.31.1",
    "typedoc": "^0.22.17",
    "codecov": "^3.8.3",
    "rollup": "^3.10.0",
    "@rollup/plugin-commonjs": "^24.0.0",
    "@rollup/plugin-node-resolve": "^15.0.1",
    "@rollup/plugin-replace": "^5.0.2",
    "rollup-plugin-cleanup": "^3.2.1",
    "rollup-plugin-minify-es": "^1.1.1",
    "uglify-js": "^3.17.4"
};

/**
 * Add these dev dependencies to ALL processed package.json files
 */
export let commonDevDependencyVersions = {
    "@typescript-eslint/eslint-plugin": "5.3.1",
    "@typescript-eslint/parser": "5.3.1",
    "eslint": "7.32.0",
    "eslint-plugin-header": "3.1.1",
    "eslint-plugin-import": "2.25.3",
    "eslint-plugin-node": "11.1.0",
    "eslint-config-prettier": "8.5.0",
    "eslint-plugin-prettier": "4.2.1",
    "istanbul-instrumenter-loader": "3.0.1",
    "karma": "6.3.16",
    "karma-chrome-launcher": "3.1.0",
    "karma-coverage-istanbul-reporter": "3.0.3",
    "karma-mocha": "^2.0.1",
    "karma-spec-reporter": "^0.0.34",
    "karma-webpack": "^4.0.2",
    "karma-typescript": "^5.5.3",
    "mocha": "10.0.0",
    "chromium": "^3.0.3",
    "puppeteer": "^14.2.1",
    "sinon": "^14.0.0",
    "nyc": "^15.1.0",
    "ts-loader": "8.4.0",
    "ts-mocha": "10.0.0",
    "typescript": "^4.7.4",
    "webpack": "^4.46.0",
    "pako": "^2.0.3"
};

/**
 * Apply any expected defaults to the provided configuration, this is a helper
 * to ensure that the expected values (for the script) are always present
 * @param theRepos - The IRepoSyncDetails to ensure that the defaults are set
 */
export function applyRepoDefaults(theRepos: IRepoSyncDetails) {
    // Set default values
    Object.keys(theRepos).forEach((repoName) => {
        let repoDetails = theRepos[repoName];

        repoDetails.destFolder = repoDetails.destFolder || MERGE_DEST_BASE_FOLDER + "/" + repoName;
        repoDetails.mergeBranchName = repoDetails.mergeBranchName || BRANCH_PREFIX + "/" + repoName;
        repoDetails.tagPrefix = repoDetails.tagPrefix || repoName;
        // repoDetails.mergeStartPoint = repoDetails.mergeStartPoint || repoName + "/" + repoDetails.branch;
    });
}