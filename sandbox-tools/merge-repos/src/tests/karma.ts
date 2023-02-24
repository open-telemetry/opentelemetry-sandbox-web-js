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

const KARMA_BROWSER_TEMPLATE = LICENSE_HEADER + "const karmaWebpackConfig = require(\"./karma.webpack\");\n" +
    "const karmaBaseConfig = require(\"${karma.base}\");\n" +
    "\n" +
    "module.exports = (config) => {\n" +
    "  config.set(Object.assign({}, karmaBaseConfig, {\n" +
    "    webpack: karmaWebpackConfig\n" +
    "  }))\n" +
    "};\n" +
    "\n";

// This is the webpack configuration for browser Karma tests with coverage.
const KARMA_WEBPACK_TEMPLATE = LICENSE_HEADER + "const webpackNodePolyfills = require(\"${webpack.polyfills}\");\n" +
    "\n" +
    "module.exports = {\n" +
    "  mode: \"development\",\n" +
    "  target: \"web\",\n" +
    "  output: { filename: \"bundle.js\" },\n" +
    "  resolve: { extensions: [\".ts\", \".js\"] },\n" +
    "  devtool: \"inline-source-map\",\n" +
    "  module: {\n" +
    "    rules: [\n" +
    "      { test: /\.ts$/, use: \"ts-loader\" },\n" +
    "      {\n" +
    "        enforce: \"post\",\n" +
    "        exclude: /(node_modules|\.test\.[tj]sx?$)/,\n" +
    "        test: /\.ts$/,\n" +
    "        use: {\n" +
    "          loader: \"istanbul-instrumenter-loader\",\n" +
    "          options: { esModules: true }\n" +
    "        }\n" +
    "      },\n" +
    "      // This setting configures Node polyfills for the browser that will be\n" +
    "      // added to the webpack bundle for Karma tests.\n" +
    "      { parser: { node: webpackNodePolyfills } }\n" +
    "    ]\n" +
    "  }\n" +
    "};\n";

const KARMA_WORKER_TEMPLATE = LICENSE_HEADER + "const karmaWebpackConfig = require('${karma.base.webpack}');\n" +
    "const karmaBaseConfig = require('${karma.worker}');\n" +
    "\n" +
    "module.exports = (config) => {\n" +
    " config.set(Object.assign({}, karmaBaseConfig, {\n" +
    "   webpack: karmaWebpackConfig,\n" +
    " }))\n" +
    "};\n";

const KARMA_DEBUG_TEMPLATE = LICENSE_HEADER +  "const karmaBaseConfig = require(\"${karma.debug}\");\n" +
    "\n" +
    "module.exports = (config) => {\n" +
    "  config.set(Object.assign({}, karmaBaseConfig, {\n" +
    "  }));\n" +
    "};\n";

const KARMA_DEBUG_BASE_TEMPLATE = LICENSE_HEADER + "const baseConfig = require(\"./karma.base\");\n" +
    "\n" +
    "// Copied from karma/lib/constants.js (https://github.com/karma-runner/karma/blob/master/lib/constants.js)\n" +
    "const LOG_DEBUG = \"DEBUG\";\n" +
    "const LOG_INFO = \"INFO\";\n" +
    "const LOG_WARN = \"WARN\";\n" +
    "const LOG_ERROR = \"ERROR\";\n" +
    "const LOG_DISABLE = \"OFF\";\n" +
    "\n" +
    "process.env.CHROME_BIN = require(\"puppeteer\").executablePath();\n" +
    "\n" +
    "// Default to using edge locally -- choose your own browser as required\n" +
    "// process.env.CHROME_BIN = \"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe\";\n" +
    "\n" +
    "module.exports = {\n" +
    "    ...baseConfig,\n" +
    "    browsers: [\"Chromium_without_security\"],\n" +
    "    karmaTypescriptConfig: {\n" +
    "        tsconfig: \"./tsconfig.test.json\",\n" +
    "        compilerOptions: {\n" +
    "            sourceMap: true\n" +
    "        },\n" +
    "        bundlerOptions: {\n" +
    "            sourceMap: true\n" +
    "        },\n" +
    "        coverageOptions: {\n" +
    "            instrumentation: false,\n" +
    "            sourceMap: true\n" +
    "        }\n" +
    "    },\n" +
    "\n" +
    "    reporters: [ \"spec\" ],\n" +
    "\n" +
    "    customLaunchers: {\n" +
    "        Chromium_without_security: {\n" +
    "            base: \"Chrome\",\n" +
    "            flags: [\"--disable-web-security\", \"--disable-site-isolation-trials\"]\n" +
    "        }\n" +
    "    },\n" +
    "    logLevel: LOG_DEBUG\n" +
    "};\n";

export async function createPackageKarmaConfig(git: SimpleGit, basePath: string, destPath: string, mergeBasePath: string, packageDetails: IMergePackageDetail) {
    let dest = path.join(basePath, destPath).replace(/\\/g, "/");
    let addWebpack = false;

    // Only update / create if the merge root (final destination) doesn't exist.
    // this is to support migration and updates to "main" without merge conflicts
    let mergeBrowserCfg = path.join(dest, "karma.browser.conf.js").replace(/\\/g, "/");
    if (!fs.existsSync(mergeBrowserCfg)) {
        if (!fs.existsSync(path.join(dest, "karma.conf.js").replace(/\\/g, "/"))) {
            let hasTestDefinition = fs.existsSync(path.join(dest, "test/browser/index-webpack.ts").replace(/\\/g, "/")) ||
                fs.existsSync(path.join(dest, "test/index-webpack.ts").replace(/\\/g, "/"));

            if (hasTestDefinition) {
                let browserCfg = path.join(dest, "karma.browser.conf.js").replace(/\\/g, "/");
                let karmaBase = path.relative(dest, path.join(basePath, "./karma.base")).replace(/\\/g, "/");
        
                log(` -- ${browserCfg} creating...`);
                fs.writeFileSync(browserCfg, KARMA_BROWSER_TEMPLATE.replace("${karma.base}", karmaBase));
                await git.add(browserCfg);

                addWebpack = true;
            }
        }
    }

    if (!packageDetails.noWorkerTests) {
        let mergeWorkerkCfg = path.join(dest, "karma.worker.js").replace(/\\/g, "/");
        if (!fs.existsSync(mergeWorkerkCfg)) {
            let hasTestDefinition = fs.existsSync(path.join(dest, "test/worker/index-webpack.worker.ts").replace(/\\/g, "/")) ||
                fs.existsSync(path.join(dest, "test/index-webpack.worker.ts").replace(/\\/g, "/"));

            if (hasTestDefinition) {
                let karmaBaseWebpack = path.relative(dest, path.join(basePath, "./karma.webpack")).replace(/\\/g, "/");
                let karmaBaseWorker = path.relative(dest, path.join(basePath, "./karma.worker")).replace(/\\/g, "/");
                
                let webpackCfg = path.join(dest, "karma.worker.js").replace(/\\/g, "/");
                log(` -- ${webpackCfg} creating...`);
                fs.writeFileSync(webpackCfg, KARMA_WORKER_TEMPLATE
                    .replace("${karma.base.webpack}", karmaBaseWebpack)
                    .replace("${karma.worker}", karmaBaseWorker));
                await git.add(webpackCfg);

                addWebpack = true;
            } else {
                log(` -- ${path.join(dest, "test/worker/index-webpack.worker.ts")} -- missing`);
                log(` -- ${path.join(dest, "test/index-webpack.worker.ts")} -- missing`);
            }
        } else {
            log(` -- Existing ${mergeWorkerkCfg}`);
        }
    } else {
        log(` -- Skipping worker tests for ${packageDetails.name}`);
    }

    if (addWebpack) {
        let mergeWebpackCfg = path.join(dest, "karma.webpack.js").replace(/\\/g, "/");
        if (!fs.existsSync(mergeWebpackCfg)) {
            let webpackPolyfills = path.relative(dest, path.join(basePath, "./webpack.node-polyfills.js")).replace(/\\/g, "/");
        
            let webpackCfg = path.join(dest, "karma.webpack.js").replace(/\\/g, "/");
            log(` -- ${webpackCfg} creating...`);
            fs.writeFileSync(webpackCfg, KARMA_WEBPACK_TEMPLATE
                .replace("${webpack.polyfills}", webpackPolyfills));
            await git.add(webpackCfg);
        }
    }
    
    let mergeDebugCfg = path.join(dest, "karma.debug.conf.js").replace(/\\/g, "/");
    if (!fs.existsSync(mergeDebugCfg)) {
        let debugCfg = path.join(dest, "karma.debug.conf.js").replace(/\\/g, "/");
        let karmaDebugBase = path.relative(dest, path.join(basePath, "./karma.base")).replace(/\\/g, "/");

        log(` -- ${debugCfg} creating...`);
        fs.writeFileSync(debugCfg, KARMA_DEBUG_TEMPLATE.replace("${karma.debug}", karmaDebugBase));
        await git.add(debugCfg);
    }

    let mergeDebugBaseCfg = path.join(dest, "karma.debug.js").replace(/\\/g, "/");
    if (!fs.existsSync(mergeDebugBaseCfg)) {
        let debugBaseCfg = path.join(basePath, "karma.debug.js").replace(/\\/g, "/");
        log(` -- ${debugBaseCfg} creating...`);
        fs.writeFileSync(debugBaseCfg, KARMA_DEBUG_BASE_TEMPLATE);
        await git.add(debugBaseCfg);
    }
}