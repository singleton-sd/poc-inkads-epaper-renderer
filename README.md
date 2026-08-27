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

Proof of concept. The pipeline from upload to device-ready bytes is complete
for the Waveshare 7.5″ B/W target: ingest → crop/resize → dither → pack.
Golden fixtures (#7) and hardware validation (#8) are still open.

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
import { getDisplayProfile, listDisplayProfiles } from '@singleton-sd/inkads-epaper-renderer';
import { ingestImageToProfile } from '@singleton-sd/inkads-epaper-renderer/node';

listDisplayProfiles(); // [{ id: 'waveshare-7.5-bw', ... }, ...]
const profile = getDisplayProfile('waveshare-7.5-bw');
const rgb = ingestImageToProfile(pngOrJpegBytes, {
  profile,
  crop: { x: 0.5, y: 0.5 }, // optional cover-fit position
});
// rgb.width === 800, rgb.height === 480
```

Monochrome modes (`threshold`, `floyd-steinberg`, `atkinson`) convert profile
RGB to a 1-bit bitmap (`0` black / `1` white). Prefer `threshold` for text,
logos, and QR; use Atkinson for UI/illustration contrast; Floyd–Steinberg for
fullest grey simulation. Future panels (including colour, issue #9) add new ids
to the registry.

## Packed framebuffer and preview

```ts
import {
  packMonoBitmap,
  renderMono,
  toPreviewImage,
  waveshare75BwProfile as profile,
} from '@singleton-sd/inkads-epaper-renderer';
import { ingestImageToProfile } from '@singleton-sd/inkads-epaper-renderer/node';

const rgb = ingestImageToProfile(uploadBytes, { profile });
const bitmap = renderMono(rgb, { mode: 'atkinson' });
const packed = packMonoBitmap(bitmap, { profile });

packed.bytes.length; // 48000 — send these bytes to the device
packed.metadata; // profileId, rendererVersion, mode, byteLength, checksum, …

const preview = toPreviewImage(packed, profile);
canvasContext.putImageData(new ImageData(preview.data, preview.width), 0, 0);
```

The packed layout is the firmware contract: row-major, 8 pixels per byte, MSB
is the leftmost pixel, and with `polarity: 'normal'` a set bit is a dark pixel.
`checksum` is CRC-32 (IEEE) over the packed bytes, so firmware can verify a
download with the same cheap algorithm. Preview pixels are expanded from the
packed bytes, not the upload, so what you see is what the panel renders.
Rotated orientations are rejected until hardware validation (#8).

## Framing: crop, zoom, and letterbox

By default the image is **cover-fit**: scaled by `max(800 / width, 480 / height)`
so it fills the panel, with the overflow cropped. Aspect ratio is never
distorted, but content is discarded — a tall portrait can lose most of its
height. `crop` slides that fixed window; `sourceRect` sets the window itself,
which is what zooming is.

```ts
const framed = normaliseToProfile(decoded, {
  profile,
  // Region of the source to show, in source pixels.
  sourceRect: { x: 120, y: 80, width: 900, height: 540 },
});

framed.sourceRect; // the region actually used, after aspect correction
```

The rectangle may extend beyond the image on any side. That is how you zoom out
past cover-fit, and the uncovered area is filled with `background` (white by
default), which is how you letterbox instead of crop:

```ts
// Fit an entire 1000×2000 portrait onto the panel, bars either side.
normaliseToProfile(decoded, {
  profile,
  sourceRect: { x: -1166, y: 0, width: 3333, height: 2000 },
  background: { r: 255, g: 255, b: 255 },
});
```

If the rectangle's aspect ratio does not match the panel, it is **grown** about
its centre until it does, never squashed: everything the user framed stays
visible, and the artwork is never distorted. `sourceRect` on the result reports
the corrected region, so a framing UI can draw handles matching the real output
and warn when most of an upload is being discarded.

`crop` and `sourceRect` are mutually exclusive, since a rectangle already
carries its own position.

## Browser and Node

The package has two entry points, so the browser never pays for a bundled
image codec:

| Entry                                       | Runs in          | Contains                                                  |
| ------------------------------------------- | ---------------- | --------------------------------------------------------- |
| `@singleton-sd/inkads-epaper-renderer`      | Browser and Node | Profiles, crop/resize, dither, pack, preview              |
| `@singleton-sd/inkads-epaper-renderer/node` | Node only        | `decodeImage`, `ingestImageToProfile`, `encodePreviewPng` |

The root entry point imports no Node built-ins, so the full
crop → dither → pack → preview pipeline can re-run live in the browser as the
user frames their creative. A test walks the import graph of each entry point
and fails if a Node built-in or codec reaches the root one.

Only turning an uploaded file into pixels differs by platform. In the browser
the platform already has a decoder, so use it and pass the canvas pixels to
`fromRgbaImageData`:

```ts
import {
  fromRgbaImageData,
  normaliseToProfile,
  waveshare75BwProfile as profile,
} from '@singleton-sd/inkads-epaper-renderer';

const bitmap = await createImageBitmap(file);
const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
const context = canvas.getContext('2d')!;
context.drawImage(bitmap, 0, 0);

const decoded = fromRgbaImageData(context.getImageData(0, 0, bitmap.width, bitmap.height));
const rgb = normaliseToProfile(decoded, { profile, crop: { x: 0.5, y: 0.5 } });
```

`encodePreviewPng` is server-only for the same reason: in the browser, draw the
`PreviewImage` to a canvas and use `canvas.toBlob()` when you need a file.

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
