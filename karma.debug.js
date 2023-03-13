/*!
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

const baseConfig = require("./karma.base");

// Copied from karma/lib/constants.js (https://github.com/karma-runner/karma/blob/master/lib/constants.js)
const LOG_DEBUG = "DEBUG";
const LOG_INFO = "INFO";
const LOG_WARN = "WARN";
const LOG_ERROR = "ERROR";
const LOG_DISABLE = "OFF";

process.env.CHROME_BIN = require("puppeteer").executablePath();

// Default to using edge locally -- choose your own browser as required
// process.env.CHROME_BIN = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";

module.exports = {
    ...baseConfig,
    browsers: ["Chromium_without_security"],
    karmaTypescriptConfig: {
        tsconfig: "./tsconfig.test.json",
        compilerOptions: {
            sourceMap: true
        },
        bundlerOptions: {
            sourceMap: true
        },
        coverageOptions: {
            instrumentation: false,
            sourceMap: true
        }
    },

    reporters: [ "spec" ],

    customLaunchers: {
        Chromium_without_security: {
            base: "Chrome",
            flags: ["--disable-web-security", "--disable-site-isolation-trials"]
        }
    },
    logLevel: LOG_DEBUG
};
