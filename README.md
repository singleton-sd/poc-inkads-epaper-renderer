# InkAds e-paper renderer

Shared TypeScript package that converts advertiser artwork into
**display-ready e-paper assets** for InkAds.

The same implementation is intended for:

- browser preview (marketing demo and advertiser UI)
- backend asset processing
- deterministic fixtures used to validate firmware on Waveshare hardware

Image processing stays in this package / the cloud. ESP32 firmware consumes
packed framebuffer bytes only.

## Status

Proof of concept. Public API and the first Waveshare 7.5″ black-and-white
profile are under construction — see
[GitHub Issues](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues).

Package name: `@singleton-sd/inkads-epaper-renderer` (private until publish is
enabled).

## Requirements

- Node.js 22.12 or newer
- pnpm 11.22

```sh
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

## Local hooks

After `pnpm install`, Husky installs commit hooks. Once per clone you can also
confirm:

```sh
git config core.hooksPath .husky
```

Hooks enforce Conventional Commits with a GitHub `#issue` ticket, TypeScript
filename conventions, and branch names of the form
`<type>/<issue>-<kebab-title>`.

## Releases

Semantic versions are produced by `release-it` from Conventional Commits:

```sh
pnpm release      # dry-run
pnpm release:ci   # CI release (tag + GitHub Release; npm publish off for now)
```

Never hand-edit `package.json` version.

## Initial display profile

| Field       | Value              |
| ----------- | ------------------ |
| Panel       | Waveshare 7.5″ B/W |
| Resolution  | 800×480            |
| Depth       | 1 bit per pixel    |
| Packed size | 48,000 bytes       |

## Related repositories

- [`poc-inkads-marketing`](https://github.com/singleton-sd/poc-inkads-marketing) — public site / interactive preview consumer
- [`poc-inkads-firmware-display-device`](https://github.com/singleton-sd/poc-inkads-firmware-display-device) — ESP32 device firmware
- [`poc-inkads-assets`](https://github.com/singleton-sd/poc-inkads-assets) — brand SVG/PNG masters (not this package)

## Architecture reference

Follow repository conventions from
[`poc-plattform-kit`](https://github.com/singleton-sd/poc-plattform-kit) and
Singleton SD skills (`repo-init`, `git-conventions`, `isolated-worktree`) where
applicable.

## License

Proprietary — Singleton SD. This repository is public for PoC collaboration;
do not commit secrets or commercially sensitive material.
