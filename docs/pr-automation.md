# Pull request automation

Every pull request gets CI, two AI reviewers, and an agent that stays with it until the
feedback is handled. The repo holds the agent side; the reviewers are GitHub apps.

## In the repo

- **`.agents/skills/pr-watch/`** — the loop an agent runs after opening a PR: one
  backgrounded `pr-digest --watch` call waits for every check on the head commit, then
  prints a short verdict (`green`, `failures`, `open-comments`, `pending`, `out-of-sync`).
  The agent fixes failures, answers each review comment, pushes, and repeats.
  `CLAUDE.md` makes this the default. Needs `gh`, `jq`, and `perl`.
- **`.coderabbit.yaml`** — CodeRabbit settings (skips vendored BMAD skills and audio).
- **Workflows** — actions pinned to commit SHAs (Dependabot keeps them current),
  read-only token permissions, superseded PR runs cancelled, and a nightly run of the
  Linux, Windows, and macOS suites on `master`.

## One-time setup outside the repo

1. **Greptile** — sign in at greptile.com with GitHub, install the Greptile app, and
   give it access to `paulpreibisch/AgentVibes`. It reviews each PR and posts a
   confidence score.
2. **CodeRabbit** — sign in at coderabbit.ai with GitHub and install the app on
   `paulpreibisch/AgentVibes`. It reads `.coderabbit.yaml` automatically.
3. **Cursor auto-fix (optional)** — in Cursor's web dashboard, connect GitHub and enable
   Bugbot for this repository, with autofix turned on. Cursor's agent then pushes
   commits that address review findings, as it does on the Rakazo repo. Its commits land
   on the PR branch, so an agent watching the same PR should fetch before pushing.

The first PR after setup is the test: each app should leave a review within a few minutes.
