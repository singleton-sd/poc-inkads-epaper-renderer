# Contributing

## Workflow

1. Pick an open GitHub Issue that is ready (no unresolved `Depends on:`).
2. Create a sibling worktree from current `origin/main`:

   ```sh
   pnpm worktree:add --type feat --issue 2 --slug waveshare-bw-profile
   ```

   Branch shape: `<type>/<issue-number>-<kebab-title>`.

3. Implement only that issue.
4. Open a PR whose title is a Conventional Commit subject including `#N`, and
   whose body contains `Closes #N`. A human merges.

## Conventional Commits

```text
type: #123 Short sentence-case subject
```

Allowed types: `feat` `fix` `docs` `chore` `refactor` `test` `ci` `build`
`perf` `style` `revert`.

Local Husky hooks:

- `prepare-commit-msg` injects `#N` from the branch name when missing
- `commit-msg` runs commitlint (ticket, length, blank body line)
- `pre-commit` checks TypeScript filename conventions
- `post-checkout` rejects invalid branch names

Install hooks via `pnpm install` (`prepare` → husky).

## Releases

`release-it` bumps semver from Conventional Commits and writes
`CHANGELOG.md`. Merges to `main` (except `chore(release):` commits)
trigger `.github/workflows/release.yml`, which runs `pnpm release:ci`:
version bump + changelog commit on `main`, `X.Y.Z` tag, GitHub Release,
and npm publish.

The push to `main` is done by the **singleton-release** GitHub App
(`vars.RELEASE_APP_ID` + `secrets.RELEASE_APP_PRIVATE_KEY`), which is on
the main ruleset bypass list. Do not use a PAT, and do not fall back to
`GITHUB_TOKEN` (that is GH013). `pnpm release` is a local dry-run: it
commits nothing, but it can dirty `package.json`, `src/version.ts`, and
`CHANGELOG.md`. Review those diffs before another dry run or a commit:

```sh
git diff -- package.json src/version.ts CHANGELOG.md
git checkout -p -- package.json src/version.ts CHANGELOG.md
```

A plain `git checkout --` of those files discards every unstaged edit
in them, not only the dry-run bump.

Do not edit the version in `package.json` by hand.

## Scope

This package turns advertiser images into e-paper previews and packed
framebuffers. Do not add UI shells, device networking, or campaign platform
code here.

## ClickUp

Product tracking may reference `POC-*` tickets. Engineering delivery and
dependencies for this repo live in GitHub Issues.
