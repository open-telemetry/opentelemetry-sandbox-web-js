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
import { log } from "../support/utils";

export const ROLLUP_CONFIG_TEMPLATE = LICENSE_HEADER + "import { createConfig } from \"${rollup.base.config}\";\n" +
    "const version = require(\"./package.json\").version;\n" +
    "const inputName = \"build/esm/index.js\";\n" +
    "\n" +
    "export default createConfig(\"${bundle.namespace}\", inputName, \"${bundle.name}\", version);\n";

export async function createPackageRollupConfig(git: SimpleGit, basePath: string, destPath: string, bundleName: string, bundleNamespace: string) {
    let dest = path.join(basePath, destPath).replace(/\\/g, "/");

    let rollupBase = path.relative(dest, path.join(basePath, "./rollup.base.config")).replace(/\\/g, "/");

    let content = ROLLUP_CONFIG_TEMPLATE
        .replace("${rollup.base.config}", rollupBase)
        .replace("${bundle.namespace}", bundleNamespace || "")
        .replace("${bundle.name}", bundleName);
    
    let tsConfigEsm = path.join(dest, "tsconfig.esm.json").replace(/\\/g, "/");
    if (!fs.existsSync(tsConfigEsm)) {
        // No ESM ts config so just use the default src
        content = content.replace("\"build/esm/index.js\"", "\"build/src/index.js\"");
    }
    
    let theFilename = path.join(dest, "rollup.config.js").replace(/\\/g, "/");

    log(` -- ${theFilename} changed -- rewriting...`);
    fs.writeFileSync(theFilename, content);
    await git.add(theFilename);
}