# Auto Merge Tools

This folder contains TypeScript source code that uses the [Simple Git](https://github.com/steveukx/git-js) project to merge the history and tags from original source [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js);  [OpenTelemetry JS API](https://github.com/open-telemetry/opentelemetry-js-api) repositories into the [opentelemetry-sandbox-web-js](../../README.md).

The main Scripts created by TypeScript are

## repoSyncMerge

This script merges the official repository branches into a staging branch so that the complete history from the original repositories is included in this repository.

![Branches](./imgs/Merge_Script_Branches.png)

This script performs the following

- Clone the `opentelemetry/opentelemetry-sandbox-web-js` staging branch `auto-merge/repo-staging` (must exist) into a local temporary folder (removing any previous local folder first)
- Removes any possible "conflicting" files from the root of the merge branch (if present -- only needed for local testing and first run)
- Loops through each configured repository and
  - Creates a local clone of the `source` (js/contrib) repository to be merged (synchronized to the configured `branchStartPoint` (defaults to HEAD))
  - Renames ALL tags to include a configured prefix onto every tags `<repo-prefix>/<original tag>`
  - Moves all of the files for the local clone into a sub folder (`auto-merge/<repo-prefix>`) via `git mv`, so that all of the history is retained
  - Commits the move to the local branch (including the files moved as part of the message) -- as this new "history" will get merged into the `repo-staging`
  - Adds a temporary Remote for the local `source` clone to the `repo-staging` repository.
  - Creates a local branch of the `repo-staging` remote repository (for the current user `<user>/auto-merge-repo-staging`)
  - Fetch, Checkout and sync to the remote repository
  - Removes any untracked local files from this local branch (reset / clean)
  - Merges from the local `source` clone  remote branch into the `<user>/auto-merge-repo-staging` branch using `-X theirs`.
  - Auto Resolves any merge conflicts that could not be auto resolved by selecting `theirs` (for the local `source` branch of the remote repository)
  - Commits the changes into the local `<user>/auto-merge-repo-staging` branch
- At this point the hard work is now complete with the only follow up steps left are
- Iterate over the configured repositories and verifies that the `source` branch contents (all folders / files) match the contents in `<user>/auto-merge-repo-staging`
  - When this does not match (which does occur) it re-copies files that don't match and removes folders that the merge didn't auto remove.
- Perform any final cleanup requested
- Finally perform a `git push -f` to the cloned staging branch to the bot owner(s) fork `<user>/auto-merge-repo-staging` (when running the github action `<user>` is `opentelemetrybot`)
- With the remote branch now on GitHub, it creates a PR to merge the fork branch `<user>/auto-merge-repo-staging` into the sandbox `opentelemetry/opentelemetry-sandbox-web-js` repository `auto-merge/repo-staging` branch.
- It also attempts to push all tags from local `<user>/auto-merge-repo-staging` to Github and the upstream `opentelemetry/opentelemetry-sandbox-web-js` (this may fail if permissions are not available)
