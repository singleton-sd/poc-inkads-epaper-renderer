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

Proof of concept. Display profiles and the Waveshare 7.5″ B/W target are
available; crop, dither, and packing land in issues #3–#5.

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

Semantic versions are produced by `release-it` from Conventional Commits.

On every push to `main` (except an existing `chore: Release …` commit), GitHub
Actions runs `pnpm release:ci`. That bumps the version, updates `CHANGELOG.md`,
pushes a semver tag, and creates a GitHub Release. npm publish stays off for
now.

Requires `release-it` ≥ 19.0.4 (Octokit logger fix for GitHub Releases).

Locally:

```sh
pnpm release      # dry-run
pnpm release:ci   # only from main; prefer the Actions workflow
```

Never hand-edit `package.json` version.

### Recovery: tag exists, GitHub Release missing

If CI pushed a semver tag but failed while creating the GitHub Release, **do not**
rerun `pnpm release:ci` — that can cut another empty version bump.

Create the missing Release from the existing tag instead:

```sh
# Example for tag 0.0.3
gh release create 0.0.3 --title "v0.0.3" --generate-notes --verify-tag
```

Verify:

```sh
gh release view 0.0.3
gh release list
```

The Release page should list the tag under
https://github.com/singleton-sd/poc-inkads-epaper-renderer/releases.

## Display profiles

Each hardware panel is a **display profile** with a stable id, fixed resolution,
and expected packed framebuffer size. The renderer pipeline takes a profile —
not arbitrary width/height — so cloud, preview, and firmware stay aligned.

| Field       | `waveshare-7.5-bw` |
| ----------- | ------------------ |
| Panel       | Waveshare 7.5″ B/W |
| Resolution  | 800×480 (5:3)      |
| Depth       | 1 bit per pixel    |
| Packed size | 48,000 bytes       |

```ts
import {
  getDisplayProfile,
  ingestImageToProfile,
  listDisplayProfiles,
} from '@singleton-sd/inkads-epaper-renderer';

listDisplayProfiles(); // [{ id: 'waveshare-7.5-bw', ... }, ...]
const profile = getDisplayProfile('waveshare-7.5-bw');
const rgb = ingestImageToProfile(pngOrJpegBytes, {
  profile,
  crop: { x: 0.5, y: 0.5 }, // optional cover-fit position
});
// rgb.width === 800, rgb.height === 480
```

PNG/JPEG decode and crop/resize are available. Monochrome modes
(`threshold`, `floyd-steinberg`, `atkinson`) convert profile RGB to a
1-bit bitmap (`0` black / `1` white). Prefer `threshold` for text, logos,
and QR; use Atkinson for UI/illustration contrast; Floyd–Steinberg for
fullest grey simulation. Packing follows in a later issue. Future panels
(including colour, issue #9) add new ids to the registry.

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
