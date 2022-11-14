# Changelog

## [0.32.0](https://github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.31.0...instrumentation-graphql-v0.32.0) (2022-11-02)


### Features

* support `graphql` v16 ([#998](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/998)) ([5da46ef](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/5da46ef7a29bbc64f600d794b1e68bb6738a9f2e))


### Bug Fixes

* **graphql:** graphql instrumentation throw for sync calls ([#1254](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/1254)) ([524d98e](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/524d98e4fac3322b7da3cc865f53043f03f67bb7))
* separate public and internal types for all instrumentations ([#1251](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/1251)) ([e72ea58](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/e72ea58cfb888a90590970f63d3a042a8ea3aaf2))

## [0.31.0](https://github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.30.0...instrumentation-graphql-v0.31.0) (2022-09-15)


### Features

* **graphql:** exported all graphql types ([#1097](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/1097)) ([710103b](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/710103b4d9486fc2e5a9fa567ea1982f218ab4bf))

## [0.30.0](https://github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.29.0...instrumentation-graphql-v0.30.0) (2022-09-02)


### Features

* update experimental Otel deps to ^0.31.0 ([#1096](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/1096)) ([4c8843b](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/4c8843be14896d1159a622c07eb3a049401ccba1))
* update experimental Otel deps to ^0.32.0 ([#1143](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/1143)) ([6fb1911](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/6fb191139aed2ca763300dcf9adb51121a88f97e))

## [0.29.0](https://github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.28.0...instrumentation-graphql-v0.29.0) (2022-06-08)


### Features

* update core dependencies stable ^1.3.1 experimental ^0.29.2 ([141b155](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/141b155e344980b51264e26b26c117b2113bcef6))

## [0.28.0](https://github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.27.4...instrumentation-graphql-v0.28.0) (2022-05-14)


### Features

* add supported node versions for all packages ([#973](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/973)) ([baaacbd](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/baaacbdd35ca4baab0afae64647aa8c0380ee4b7))
* use Otel SDK 1.2/0.28 ([#984](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/984)) ([098c2ed](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/098c2ed6f9c5ab7bd865685018c0777245aab3b7))

### [0.27.4](https://github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.27.3...instrumentation-graphql-v0.27.4) (2022-03-02)


### Bug Fixes

* **graphql:** fix `graphql.operation.name` field ([#903](https://github.com/open-telemetry/opentelemetry-js-contrib/issues/903)) ([5529261](https://github.com/open-telemetry/opentelemetry-js-contrib/commit/552926146c838efd7e2b778ae6fb815e9e304965))

### [0.27.3](https://www.github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.27.2...instrumentation-graphql-v0.27.3) (2022-02-06)


### Bug Fixes

* **graphql:** move graphql to dependencies ([#850](https://www.github.com/open-telemetry/opentelemetry-js-contrib/issues/850)) ([18e4f93](https://www.github.com/open-telemetry/opentelemetry-js-contrib/commit/18e4f93007b19ecb33f8711ae0d20c51a90887d5))

### [0.27.2](https://www.github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.27.1...instrumentation-graphql-v0.27.2) (2022-01-24)


### Bug Fixes

* rename lerna's --include-filtered-dependencies option ([#817](https://www.github.com/open-telemetry/opentelemetry-js-contrib/issues/817)) ([cf268e7](https://www.github.com/open-telemetry/opentelemetry-js-contrib/commit/cf268e7a92b7800ad6dbec9ca77466f9ee03ee1a))
* use localhost for services in CI ([#816](https://www.github.com/open-telemetry/opentelemetry-js-contrib/issues/816)) ([f497313](https://www.github.com/open-telemetry/opentelemetry-js-contrib/commit/f4973133e86549bbca301983085cc67788a10acd))

### [0.27.1](https://www.github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.27.0...instrumentation-graphql-v0.27.1) (2021-12-22)


### Bug Fixes

* early close of span with graphql execute ([#752](https://www.github.com/open-telemetry/opentelemetry-js-contrib/issues/752)) ([4a3b410](https://www.github.com/open-telemetry/opentelemetry-js-contrib/commit/4a3b4107e40845091a267e5452ea17eed8a9fdf6))

## [0.27.0](https://www.github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.26.1...instrumentation-graphql-v0.27.0) (2021-11-30)


### Features

* use latest instrumentation base ([#769](https://www.github.com/open-telemetry/opentelemetry-js-contrib/issues/769)) ([7aff23e](https://www.github.com/open-telemetry/opentelemetry-js-contrib/commit/7aff23ebebbe209fa3b78c2e7f513c9cd2231be4))

### [0.26.1](https://www.github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.26.0...instrumentation-graphql-v0.26.1) (2021-11-12)


### Bug Fixes

* adding nested input variables in graphql plugin ([#720](https://www.github.com/open-telemetry/opentelemetry-js-contrib/issues/720)) ([7a7d3a3](https://www.github.com/open-telemetry/opentelemetry-js-contrib/commit/7a7d3a35e66678cf7d11fb9c89b8a26f2d4bfd6b))

## [0.26.0](https://www.github.com/open-telemetry/opentelemetry-js-contrib/compare/instrumentation-graphql-v0.25.0...instrumentation-graphql-v0.26.0) (2021-10-22)


### Features

* support API and SDK 1.0 ([#706](https://www.github.com/open-telemetry/opentelemetry-js-contrib/issues/706)) ([096b694](https://www.github.com/open-telemetry/opentelemetry-js-contrib/commit/096b694bbc3079f0ab4ee0462869b10eb8185202))