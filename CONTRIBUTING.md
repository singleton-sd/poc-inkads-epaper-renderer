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

All singleton-sd repos use **tag-only releases** (decision 14 Nov 2026).
The release workflow must never commit or push to the default branch, and
must not use a ruleset bypass.

`release-it` computes the next semver from the latest `X.Y.Z` tag plus
Conventional Commits. On merge to `main`, `.github/workflows/release.yml`
runs `pnpm release:ci`: it bumps `package.json` in the CI workspace only,
publishes to npm, pushes **only** `refs/tags/<X.Y.Z>` (branch rulesets do
not apply to tag refs), and opens a GitHub Release with generated notes.
`CHANGELOG.md` is historical; new notes live on the GitHub Release.

`pnpm release` is a local dry-run (it will not push a tag). Do not edit
the version in `package.json` by hand.

## Scope

This package turns advertiser images into e-paper previews and packed
framebuffers. Do not add UI shells, device networking, or campaign platform
code here.

## ClickUp

Product tracking may reference `POC-*` tickets. Engineering delivery and
dependencies for this repo live in GitHub Issues.
