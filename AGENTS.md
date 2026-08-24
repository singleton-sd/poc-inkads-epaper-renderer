# AGENTS.md — InkAds e-paper renderer

This repository is public. Never commit secrets, credentials, private customer
information, contracts, pricing, or commercially sensitive ClickUp content.

## Engineering workflow

- GitHub Issues are the engineering source of truth in this repository.
- ClickUp tracks product/initiative work across InkAds; link related `POC-*`
  tickets in issue bodies when useful.
- Use one independently mergeable issue per branch, worktree, and PR.
- Tracking/parent issues are not implementation units.
- An unresolved `Depends on: #N` means the issue must not be started.
- Branches use `<type>/<issue-number>-<kebab-title>`.
- Work in sibling worktrees created from current `origin/main`; never edit
  directly on `main`.
- PR bodies must use `Closes #N`; humans merge.
- Remove and prune worktrees after merge.

## Package boundaries

- Framework-independent TypeScript — no React, Astro, or backend framework
  coupling in the library core.
- Screen-specific assumptions live behind display profiles.
- Consumers: marketing preview, advertiser app, and cloud asset pipeline must
  share this package rather than reimplementing pixel logic.
- Firmware must not decode JPEG/PNG or dither; it receives packed bytes only.

## Stack and quality gate

- Node.js 22.12+ and pnpm.
- Strict TypeScript.
- Deterministic output: same input + same render configuration → identical
  framebuffer bytes.
- Run format, lint, typecheck, and tests before pushing (scripts land with the
  bootstrap issue).
