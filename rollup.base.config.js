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

import nodeResolve from "@rollup/plugin-node-resolve";
import cleanup from "rollup-plugin-cleanup";
import commonjs from '@rollup/plugin-commonjs';

const UglifyJs = require('uglify-js');

const banner = `/*
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
`;

function doCleanup() {
    return cleanup({
        comments: [
            'some', 
            /^\*\*\s*@class\s*$/
        ]
    })
}

function isSourceMapEnabled(options) {
    if (options) {
        return options.sourceMap !== false && options.sourcemap !== false;
    }

    return false;
}

function _doMinify(code, filename, options, chunkOptions) {
    var theCode = {};
    theCode[filename] = code;

    let theOptions = Object.assign({}, options);
    if (theOptions.hasOwnProperty("sourcemap")) {
        delete theOptions.sourcemap;
    }

    if (isSourceMapEnabled(options)) {
        theOptions.sourceMap = {
            filename: filename
        };
        if (filename) {
            theOptions.sourceMap.url = filename + ".map";
        }
    }

    var result = UglifyJs.minify(theCode, theOptions);

    if (result.error) {
        throw new Error(JSON.stringify(result.error));
    }

    var transform = {
        code: result.code
    };

    if (isSourceMapEnabled(options) && result.map) {
        transform.map = result.map;
    }

    return transform;
}

export function uglify3(options = {}) {

    return {
        name: "internal-rollup-uglify-js",
        renderChunk(code, chunk, chkOpt) {
            return _doMinify(code, chunk.filename, options, chkOpt);
        }
    }
}
  
const browserRollupConfigFactory = (name, entryInputName, outputName, version, isProduction, isVersioned = true, format = 'umd', postfix = '') => {
    var outputPath = `build/bundle/${format}/${outputName}-${version}${postfix}.js`;
    var prodOutputPath = `build/bundle/${format}/${outputName}-${version}${postfix}.min.js`;
    var inputPath = `${entryInputName}`;
    if (!isVersioned) {
        outputPath = `build/bundle/${format}/${outputName}${postfix}.js`;
        prodOutputPath = `build/bundle/${format}/${outputName}${postfix}.min.js`;
    }
    const browserRollupConfig = {
        context: 'this',
        input: inputPath,
        output: {
            file: outputPath,
            banner: banner,
            format: format,
            name: name,
            extend: true,
            sourcemap: true,
            externalLiveBindings: false
        },
        plugins: [
            nodeResolve({
                module: true,
                browser: true,
                preferBuiltins: false
            }),
            doCleanup(),
            commonjs({
                browser: true,
                include: 'node_modules/**'
            })
        ]
    };

    if (isProduction) {
        browserRollupConfig.output.file = prodOutputPath;
        browserRollupConfig.plugins.push(
            uglify3({
                toplevel: true,
                compress: {
                  passes:3,
                  unsafe: true
                },
                output: {
                  preamble: banner,
                  webkit:true
                }
            })
        );
    }

    return browserRollupConfig;
};

const nodeUmdRollupConfigFactory = (name, entryInputName, outputName, version, isProduction, isVersioned = true) => {
    var outputPath = `build/bundle/node/${outputName}-${version}.js`;
    var prodOutputPath = `build/bundle/node/${outputName}-${version}.min.js`;
    var inputPath = `${entryInputName}`;
    if (!isVersioned) {
        outputPath = `build/bundle/node/${outputName}.js`;
        prodOutputPath = `build/bundle/node/${outputName}.min.js`;
    }

    const nodeRollupConfig = {
        context: 'this',
        input: inputPath,
        output: {
            file: outputPath,
            banner: banner,
            format: "umd",
            name: name,
            extend: true,
            sourcemap: true,
            externalLiveBindings: false
        },
        plugins: [
            nodeResolve({
                module: true,
                browser: true,
                preferBuiltins: false
            }),
            doCleanup()
        ]
    };

    if (isProduction) {
        nodeRollupConfig.output.file = prodOutputPath;
        nodeRollupConfig.plugins.push(
            uglify3({
                toplevel: true,
                compress: {
                  passes:3,
                  unsafe: true
                },
                output: {
                  preamble: banner,
                  webkit:true
                }
            })
        );
    }

    return nodeRollupConfig;
};


export function createConfig(name, entryInputName, outputName, version) {
    return [
        browserRollupConfigFactory(name, entryInputName, outputName, version, true),                    // umd
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, false),             // umd
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, true, 'amd'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, false, 'amd'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, true, 'cjs'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, false, 'cjs'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, true, 'esm'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, false, 'esm'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, true, 'iife'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, false, 'iife'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, true, 'system'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, true, false, 'system'),

        browserRollupConfigFactory(name, entryInputName, outputName, version, false),                   // umd
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, false),            //umd
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, true, 'amd'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, false, 'amd'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, true, 'cjs'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, false, 'cjs'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, true, 'esm'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, false, 'esm'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, true, 'iife'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, false, 'iife'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, true, 'system'),
        browserRollupConfigFactory(name, entryInputName, outputName, version, false, false, 'system'),

        nodeUmdRollupConfigFactory(name, entryInputName, outputName, version, true),
        nodeUmdRollupConfigFactory(name, entryInputName, outputName, version, true, false),
        nodeUmdRollupConfigFactory(name, entryInputName, outputName, version, false),
        nodeUmdRollupConfigFactory(name, entryInputName, outputName, version, false, false)
    ];
}
