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
import { LICENSE_HEADER } from "../config"
import { IMergePackageDetail } from "../support/types";
import { log } from "../support/utils";

const WEBPACK_BROWSER_TEMPLATE = LICENSE_HEADER + "{\n" +
    "  const testsContext = require.context('./', false, /test$/);\n" +
    "  testsContext.keys().forEach(testsContext);\n" +
    "}\n" +
    "\n" +
    "{\n" +
    "  const testsContext = require.context('./window', false, /test$/);\n" +
    "  testsContext.keys().forEach(testsContext);\n" +
    "}\n" +
    "\n";

const WEBPACK_TEST_FOLDER_TEMPLATE = "{\n" +
"  const testsContext = require.context('${folder}', false, /test$/);\n" +
"  testsContext.keys().forEach(testsContext);\n" +
"}\n";

// This is the webpack configuration for browser Karma tests with coverage.
const WEBPACK_WORKER_TEMPLATE = LICENSE_HEADER + "const testsContext = require.context('./', false, /test$/);\n" +
    "testsContext.keys().forEach(testsContext);\n" +
    "\n";

function createTemplate(dest: string, folders: string[], addDefault: boolean) {
    let content = "";

    folders.forEach((folder) => {
        let hasFolder = fs.existsSync(path.join(dest, `test/${folder}`).replace(/\\/g, "/"));
        if (hasFolder) {
            if (!content) {
                content += LICENSE_HEADER;
            }

            content += WEBPACK_TEST_FOLDER_TEMPLATE.replace("${folder}", "./" + folder)
        }
    });

    if (!content && addDefault) {
        content = LICENSE_HEADER + WEBPACK_TEST_FOLDER_TEMPLATE.replace("${folder}", "./");
    }

    return content;
}

export async function createPackageWebpackTestConfig(git: SimpleGit, basePath: string, destPath: string, mergePath: string, packageDetails: IMergePackageDetail) {
    let dest = path.join(basePath, destPath).replace(/\\/g, "/");

    // Only update / create if the merge root (final destination) doesn't exist.
    // this is to support migration and updates to "main" without merge conflicts
    let browserCfg = path.join(dest, "test/browser/index-webpack.ts").replace(/\\/g, "/");
    if (!fs.existsSync(browserCfg)) {
        let browserCfg = path.join(dest, "test/index-webpack.ts").replace(/\\/g, "/");
        if (!fs.existsSync(browserCfg)) {
            log(` -- ${browserCfg} creating...`);
            fs.writeFileSync(browserCfg, createTemplate(dest, [ "browser", "window", "common" ], true));
            await git.add(browserCfg);
        }
    }
    
    if (!packageDetails.noWorkerTests) {
        // TODO
        let workerCfg = path.join(dest, "test/worker/index-webpack.worker.ts").replace(/\\/g, "/");
        if (!fs.existsSync(workerCfg)) {
            workerCfg = path.join(dest, "test/index-webpack.worker.ts").replace(/\\/g, "/");
            if (!fs.existsSync(workerCfg)) {
                log(` -- ${workerCfg} creating...`);
                fs.writeFileSync(workerCfg, createTemplate(dest, [ "worker", "window", "common" ], true));
                await git.add(workerCfg);
            }
        }
    }
}