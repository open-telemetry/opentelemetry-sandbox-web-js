# Development Guide

## Development Quick Start

To get the project started quickly, you can follow these steps.

```sh
git clone https://github.com/open-telemetry/opentelemetry-sandbox-web-js.git
cd opentelemetry-sandbox-web-js
npm install
npm run compile
```

This project uses [`rush`](https://rushjs.io/) to install dependencies and run this monorepo.

## Development Workflow

To work on an existing package here is a recommended workflow:

1. Set up the project by running `npm run compile` in the root directory.

1. Make changes to the packages being worked on.

1. Run `npm run build` in the directory of the package being worked on.

1. Run tests and/or an example app in the `examples` folder. The `examples` folder is set up to be linked to local packages so that changes can be tested in the browser.

## Adding a dependency

To add a dependency, add it with `rush`. First, install `rush` if it hasn't been installed yet.

```sh
npm i -g rush
```

Then switch to the directory that the package should be installed in:

```sh
cd pkgs/<package-name>
rush add --package <package-name>
```

Then switch back to the root directory and run the update command. This will ensure all new dependencies are installed and linked correctly.

```sh
cd ../
npm run rush-update
```

This will also work when local packages in this repo are added as dependencies of other local packages.