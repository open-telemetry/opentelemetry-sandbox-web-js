# Auto Merge Tools

This folder contains TypeScript source code that uses the [Simple Git](https://github.com/steveukx/git-js) project to merge the history and tags from original source [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js);  [OpenTelemetry JS API](https://github.com/open-telemetry/opentelemetry-js-api) repositories into the [opentelemetry-sandbox-web-js](../../README.md).

The main Scripts created by TypeScript are

## repoSyncMerge

This script performs the following

- Clone the `opentelemetry/opentelemetry-sandbox-web-js` staging branch `auto-merge/repo-staging` (must exist) into a local temporary folder (removing any previous local folder first)
- Removes any possible "conflicting" files from the root of the merge branch (if present -- only needed for local testing and first run)
- Loops through each configured repository and
  - Adds a temporary Remotes for the repository to be merged.
  - Creates a local branch of the remote repository
  - Fetch and Checkout the remote repository
  - Removes any untracked local files from this local branch
  - Merges the remote repository into the local branch (bringing over all of the history) using `-X theirs` strategy option.
  - Moves all of the files for the local branch into a sub folder within the local branch via `git mv`, so that all of the history is retained
  - Commits the move to the local branch (including the files moved as part of the message) -- as this new "history" will get merged into the `merge-main`
  - Renames ALL tags to include a configured prefix onto every tags `<prefix>/<original tag>`
  - Removes the temporary remote
- Once all configured repositories have been merged and moved within each of their own local branches it switches to the local `repo-staging` branch and for each configured repository
  - Merges from the local remote branch into the `repo-staging` branch using `-X theirs`.
  - Auto Resolves any merge conflicts that could not be auto resolved by ALWAYS selecting `theirs` (the local branch of the remote repository)
  - Commits the changes into the local `repo-staging` branch
- At this point the hard work is now complete with the only follow up steps left are
- Iterate over the configured repositories and delete the local branches created for report repository (without pushing)
- Perform any final cleanup requested
- Finally perform a `git push -f` to the cloned staging branch to the bot owner(s) fork `opentelemetrybot/auto-merge-repo-staging`
- With the remote branch now on GitHub, it creates a PR to merge the fork branch `opentelemetrybot/auto-merge-repo-staging` into the sandbox `opentelemetry/opentelemetry-sandbox-web-js` repository `auto-merge/repo-staging` branch.
