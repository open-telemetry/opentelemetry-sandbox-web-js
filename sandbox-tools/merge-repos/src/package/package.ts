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
import { IPackageJson, IPackages } from "../support/types";
import { log, logError, removeTrailingComma } from "../support/utils";

export function initPackageJson(_packages: IPackages, thePath: string, key: string, packageDestPath: string, isDest?: boolean) {
    var packagePath = path.join(thePath, "package.json");
    log(`Loading package ${key} => ${packagePath}`);
    if (fs.existsSync(packagePath)) {
        // Reading file vs using require(packagePath) as some package.json have a trailing "," which doesn't load via require()
        var packageText = removeTrailingComma(fs.readFileSync(packagePath, "utf-8"));
        try {
            let packageJson: IPackageJson = JSON.parse(packageText);
            let packageBase = isDest ? _packages.dest : _packages.src;

            packageBase[key] = {
                pkgPath: packagePath,
                rPath: packageDestPath.replace(/[/\\]$/, ""),
                path: thePath,
                pkg: packageJson,
                pkgText: packageText
            }

            return true;
        } catch (e) {
            logError("Unable to read [" + packagePath + "] - " + e);
        }
    } else {
        logError("Missing package.json - " + packagePath);
    }

    return false;
}