const fs = require("fs");
const globby = require("globby");
const path = require("path");

// Default paths to the source repo's
let apiPath = "../opentelemetry-js-api/";
let jsPath = "../opentelemetry-js/";
let packages = {
};

let dependencyVersions = {
    "@types/mocha": "8.2.3",
    "@types/node": "14.17.33",
    "@types/sinon": "10.0.6",
    "@types/webpack-env": "1.16.3",
    "@types/jquery": "^3.5.14",
    "@typescript-eslint/eslint-plugin": "5.3.1",
    "@typescript-eslint/parser": "5.3.1",
    "zone-js": "^0.11.4"
};

let addMissingDevDeps = {
    "karma-mocha-webworker": "1.3.0"
};

let dropDependencies = {
    "lerna": ""
};

function showHelp() {
    var scriptParts;
    var scriptName = process.argv[1];
    if (scriptName.indexOf("\\") !== -1) {
        scriptParts = scriptName.split("\\");
        scriptName = scriptParts[scriptParts.length - 1];
    } else if (scriptName.indexOf("/") !== -1) {
        scriptParts = scriptName.split("/");
        scriptName = scriptParts[scriptParts.length - 1];
    }

    console.log("");
    console.log(scriptName + " [<api-repo-path> [<js-repo-path>]]");
    console.log("--------------------------");
    console.log(" <api-repo-path>   - Identifies the path to the root of the opentelemetry-js-api repo, defaults to '../opentelemetry-js-api/'");
    console.log(" <js-repo-path>    - Identifies the path to the root of the opentelemetry-js repo, defaults to '../opentelemetry-js/'");
}

function removeTrailingComma(text) {
    return text.replace(/,(\s*[}\],])/g, "$1");
}

function checkPackageName(thePath, expectedName, isDest) {
    var packagePath = path.join(process.cwd(), thePath, "package.json");
    if (fs.existsSync(packagePath)) {
        // Reading file vs using require(packagePath) as some package.json have a trailing "," which doesn't load via require()
        var packageText = removeTrailingComma(fs.readFileSync(packagePath, "utf-8"));
        try {
            var packageJson = JSON.parse(packageText);
            if (packageJson.name === expectedName) {
                if (isDest) {
                    packages.dest = packages.dest || {};
                    packages.dest[expectedName] = {
                        pkgPath: packagePath,
                        path: thePath,
                        pkg: packageJson
                    }
                } else {
                    packages.src = packages.src || {};
                    packages.src[expectedName] = {
                        pkgPath: packagePath,
                        path: thePath,
                        pkg: packageJson
                    }
                }
                return true;
            } else {
                error("Incorrect package [" + packageJson.name + "] !== [" + expectedName + "]");
            }
        } catch (e) {
            error("Unable to read [" + packagePath + "] - " + e);
        }
    } else {
        error("Missing package.json - " + thePath);
    }

    return false;
}

function error(message) {
    console.error("!! - " + message);
}

function parseArgs() {
    if (process.argv.length < 2) {
        console.error("!!! Invalid number of arguments -- " + process.argv.length);
        return false;
    }

    let pos = 0;
    let idx = 2;
    while(idx < process.argv.length) {
        let theArg = process.argv[idx];
        if (theArg.startsWith("-")) {
            if (theArg === "-?" || theArg === "-help") {
                showHelp();
                return false;
            }

            console.log("Unknown switch [" + theArg + "]");
        } else {
            switch(pos) {
                case 0:
                    apiPath = theArg;
                    break;
                case 1:
                    jsPath = theArg;
                    break;
                default:
                    error("Unrecognized or too many arguments [" + theArg + "]");
                    return false;
            }

            pos++;
        }

        idx ++;
    }

    console.log("Using Api: " + apiPath);
    console.log("Using JS : " + jsPath);

    if (!fs.existsSync(path.resolve(".", apiPath, "src")) || !checkPackageName(apiPath, "@opentelemetry/api")) {
        error("Api repo path [" + path.resolve(".", apiPath) + "] is missing or does not appear correct")
        return false;
    }

    if (!fs.existsSync(path.resolve(".", jsPath)) ||
            !checkPackageName(jsPath, "opentelemetry") ||
            !checkPackageName(path.join(jsPath, "packages", "opentelemetry-core"), "@opentelemetry/core")) {
        error("Js repo path [" + path.resolve(".", jsPath) + "] is missing or does not appear correct")
        return false;
    }

    if (!checkPackageName(".", "opentelemetry-sandbox-web-js", true)) {
        error("Current repo folder does not appear to be the sandbox");
        return false;
    }

    return true;
}

function transformPackages(text) {
    const pkgRegEx = /@opentelemetry\/(?!sandbox-)([\w]*)/g;
    let newContent = text.replace(pkgRegEx, "@opentelemetry/sandbox-$1");

    return newContent;
}

function transform(text) {
    let newContent = transformPackages(text);

    return newContent;
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

function createNewPackageJson(dest, expectedPackageName, expectedSandboxPackage) {

    let versionUpdate = path.relative(dest, "./scripts/version-update.js").replace(/\\/g, "/");
    let srcPackage = packages.src[expectedPackageName].pkg;
    newPackage = Object.assign({}, srcPackage, {
        name: expectedSandboxPackage,
        scripts: {
            "build": "npm run version && tsc --build tsconfig.all.json && npm run package",
            "rebuild": "npm run build",
            "compile": "npm run build",
            "clean": "tsc --build --clean tsconfig.all.json",
            "package": "npx rollup -c",
            "test": "npm run test:node && npm run test:browser",
            "test:node": "nyc ts-mocha -p tsconfig.json test/**/*.test.ts --exclude 'test/browser/**/*.ts'",
            "test:browser": "nyc karma start ./karma.browser.conf.js --single-run",
            "test:debug": "nyc karma start ./karma.debug.conf.js --wait",                        
            "version": `node ${versionUpdate}`,
            "watch": "npm run version && tsc --build --watch tsconfig.all.json"
        }
    });

    Object.keys(srcPackage.scripts).forEach((script) => {
        if (!newPackage.scripts[script]) {
            if (script !== "precompile" && script !== "prewatch") {
                newPackage.scripts[script] = srcPackage.scripts[script];
            }
        }
    });
    delete newPackage.scripts["precompile"];
    delete newPackage.scripts["prewatch"];

    packages.dest[expectedSandboxPackage] = {
        isNew: true,
        pkgPath: path.join(process.cwd(), dest, "package.json"),
        path: dest,
        pkg: newPackage
    };

}

function mergeSource(dest, src, expectedPackageName) {
    console.log("Processing - " + src);
    if (!fs.existsSync(src)) {
        error("[" + src + "] - does not exist!");
        process.exit(10);
    }

    if (checkPackageName(src, expectedPackageName)) {
        let expectedSandboxPackage = transformPackages(expectedPackageName);
        if (fs.existsSync(path.join(".", path.relative(process.cwd(), path.resolve(dest, "package.json"))))) {
            if (!checkPackageName(dest, expectedSandboxPackage, true)) {
                error("Unexpected package name [" + expectedSandboxPackage + "]");
                process.exit(11);
            }
        } else {
            // No dest package.json
            createNewPackageJson(dest, expectedPackageName, expectedSandboxPackage)
        }
        
        let processedFiles = [];
        const files = globby.sync([src + "./**/*.ts", "!**/node_modules/**"]);
        files.map(inputFile => {
            if (shouldProcess(inputFile)) {
                var orgContent = fs.readFileSync(inputFile, "utf8");
                var newContent = transform(orgContent);
    
                var destPath = path.join(".", path.relative(process.cwd(), path.resolve(dest, path.relative(src, inputFile))));
                processedFiles.push(destPath);

                if (!fs.existsSync(destPath)) {
                    // File and or path doesn't exist
                    var idx = Math.max(destPath.lastIndexOf("/"), destPath.lastIndexOf("\\"));
                    if (idx !== -1) {
                        fs.mkdirSync(path.join(".", destPath.substring(0, idx)), { recursive: true });
                    }
                }
    
                fs.writeFileSync(destPath, newContent);
            }
        });
        console.log("  => " + processedFiles.length + " file" + (processedFiles.length > 1 ? "s" : ""));

        const destFiles = globby.sync([dest + "./**/*.ts", "!**/node_modules/**"]);
        destFiles.map(destFile => {
            if (shouldProcess(destFile)) {
                var destPath = path.join(".", path.relative(process.cwd(), destFile));
                if (processedFiles.indexOf(destPath) === -1) {
                    console.log(" --> Extra File: " + destPath);
                }
            }
        });

    } else {
        error("Aborting!!!");
        process.exit(20);
    }

}

function isIgnorePackage(name) {
    if (dropDependencies[name]) {
        return true;
    }

    return false;
}

function updateDependencies(srcPackage, destPackage, depKey) {
    let changed = false;
    if (srcPackage && srcPackage[depKey]) {
        let rootPackage = packages.dest["opentelemetry-sandbox-web-js"].pkg;
        let rootDeps = ((rootPackage || {})[depKey]) || {};
        let srcDeps = srcPackage[depKey];
        let destDeps = destPackage[depKey] = destPackage[depKey] || {};
        console.log(" -- " + srcPackage.name + "[" + depKey + "]");
        Object.keys(srcDeps).forEach((key) => {
            let versionDiff = false;
            let destKey = transformPackages(key);
            if (!isIgnorePackage(key)) {
                srcVersion = srcDeps[key];

                if (destKey === key) {
                    let rootVersion = rootDeps[key];
                    if (rootVersion && rootVersion !== srcVersion) {
                        versionDiff = true;
                        srcVersion = rootVersion;
                    } else if(dependencyVersions[key] && srcVersion !== dependencyVersions[key]) {
                        // Always use these versions
                        srcVersion = dependencyVersions[key];
                        versionDiff = true;
                    }
                }
    
                if (packages.src[key]) {
                    // rewrite as a fixed version for the sandbox (for optimization with rush reusing the local version)
                    srcVersion = packages.src[key].pkg.version;
                } 

                if (!destDeps[destKey] || destDeps[destKey] !== srcVersion) {
                    if (versionDiff) {
                        console.warn(`   -- ${key}  Using: [${srcVersion}]`);
                    } else {
                        console.log(`   -- ${key}`);
                    }
                    destDeps[destKey] = srcVersion;
                    changed = true;
                } else {
                    if (versionDiff) {
                        console.warn(`   -- ${key}  Using: [${srcVersion}]`);
                    }
                }
            } else {
                if (destDeps[destKey] && dropDependencies[destKey]) {
                    delete destDeps[destKey];
                    console.log(`    -- ${key} -- dropped`);
                    changed = true;
                }
            }
        });
    }

    return changed;
}
function mergePackage(srcPackage, destPackage) {
    let changed = false;

    if (srcPackage.version !== destPackage.version) {
        destPackage.version = srcPackage.version;
        changed = true;
    }

    changed = updateDependencies(srcPackage, destPackage, "dependencies") || changed;
    changed = updateDependencies(srcPackage, destPackage, "devDependencies") || changed;

    return changed;
}

function mergePackages() {
    if (packages.src) {
        Object.keys(packages.src).forEach((name) => {
            let srcPackage = packages.src[name];
            let destPackage = packages.dest[transformPackages(name)];

            if (destPackage) {
                console.log("Merging " + srcPackage.pkg.name + " --> " + (destPackage.pkg.name || "not-loaded"));

                if (mergePackage(srcPackage.pkg, destPackage.pkg)) {
                    console.log("package.json changed -- rewriting...");
                    fs.writeFileSync(destPackage.pkgPath, JSON.stringify(destPackage.pkg, null, 2));
                }
            } else {
                console.warn("Dest not present for " + srcPackage.pkg.name);
            }
        });
    }
}

if (parseArgs()) {
    mergeSource("./pkgs/api/", apiPath, "@opentelemetry/api");
    mergeSource("./pkgs/context/async-hooks/", jsPath + "/packages/opentelemetry-context-async-hooks/", "@opentelemetry/context-async-hooks");
    mergeSource("./pkgs/context/zone/", jsPath + "/packages/opentelemetry-context-zone/", "@opentelemetry/context-zone");
    mergeSource("./pkgs/context/zone-peer-dep/", jsPath + "/packages/opentelemetry-context-zone-peer-dep/", "@opentelemetry/context-zone-peer-dep");
    mergeSource("./pkgs/core/", jsPath + "/packages/opentelemetry-core/", "@opentelemetry/core");
    //mergeSource("./pkgs/exporters/otlp/trace-grpc", jsPath + "/packages/exporter-trace-otlp-grpc/", "@opentelemetry/exporter-jaeger");
    mergeSource("./pkgs/exporters/jaeger", jsPath + "/packages/opentelemetry-exporter-jaeger/", "@opentelemetry/exporter-jaeger");
    mergeSource("./pkgs/exporters/zipkin", jsPath + "/packages/opentelemetry-exporter-zipkin/", "@opentelemetry/exporter-zipkin");
    mergeSource("./pkgs/propagators/b3", jsPath + "/packages/opentelemetry-propagator-b3/", "@opentelemetry/propagator-b3");
    mergeSource("./pkgs/propagators/jaeger", jsPath + "/packages/opentelemetry-propagator-jaeger/", "@opentelemetry/propagator-jaeger");
    mergeSource("./pkgs/resources", jsPath + "/packages/opentelemetry-resources/", "@opentelemetry/resources");
    mergeSource("./pkgs/sdk/trace-base", jsPath + "/packages/opentelemetry-sdk-trace-base/", "@opentelemetry/sdk-trace-base");
    mergeSource("./pkgs/sdk/trace-node", jsPath + "/packages/opentelemetry-sdk-trace-node/", "@opentelemetry/sdk-trace-node");
    mergeSource("./pkgs/sdk/trace-web", jsPath + "/packages/opentelemetry-sdk-trace-web/", "@opentelemetry/sdk-trace-web");
    mergeSource("./pkgs/semantic-conventions", jsPath + "/packages/opentelemetry-semantic-conventions/", "@opentelemetry/semantic-conventions");
    mergeSource("./pkgs/shims/open-tracing", jsPath + "/packages/opentelemetry-shim-opentracing/", "@opentelemetry/shim-opentracing");
    mergeSource("./pkgs/template", jsPath + "/packages/template/", "@opentelemetry/template");

    mergePackages();
}