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

`release-it` bumps semver from Conventional Commits and writes `CHANGELOG.md`.
Merges to `main` trigger `.github/workflows/release.yml`, which runs
`pnpm release:ci` (tag + GitHub Release). `pnpm release` is a local dry-run.
Do not edit the version in `package.json` by hand. npm publish is disabled
until the package is ready for a registry.

## Scope

This package turns advertiser images into e-paper previews and packed
framebuffers. Do not add UI shells, device networking, or campaign platform
code here.

## ClickUp

Product tracking may reference `POC-*` tickets. Engineering delivery and
dependencies for this repo live in GitHub Issues.
