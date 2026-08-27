import { ImageIngestError } from './errors.js';
import type {
  CropPosition,
  DecodedImage,
  NormaliseToProfileOptions,
  ProfileRgbBuffer,
} from './types.js';

const DEFAULT_CROP: CropPosition = { x: 0.5, y: 0.5 };

function clampUnit(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new ImageIngestError('INVALID_CROP', `${label} must be a finite number`);
  }
  if (value < 0 || value > 1) {
    throw new ImageIngestError('INVALID_CROP', `${label} must be between 0 and 1 inclusive`);
  }
  return value;
}

function sampleNearest(
  source: DecodedImage,
  sx: number,
  sy: number,
  out: Uint8Array,
  outOffset: number,
): void {
  const x = Math.min(source.width - 1, Math.max(0, Math.round(sx)));
  const y = Math.min(source.height - 1, Math.max(0, Math.round(sy)));
  const i = (y * source.width + x) * 3;
  out[outOffset] = source.rgb[i]!;
  out[outOffset + 1] = source.rgb[i + 1]!;
  out[outOffset + 2] = source.rgb[i + 2]!;
}

/**
 * Average every source pixel covered by one output pixel.
 *
 * Nearest-neighbour discards almost all source pixels when downscaling a
 * multi-megapixel upload, and the dither stage turns that aliasing into
 * visible noise. Summing in fixed order keeps the result deterministic.
 */
function sampleAreaAverage(
  source: DecodedImage,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  out: Uint8Array,
  outOffset: number,
): void {
  const startX = Math.max(0, Math.floor(x0));
  const startY = Math.max(0, Math.floor(y0));
  const endX = Math.min(source.width, Math.max(startX + 1, Math.ceil(x1)));
  const endY = Math.min(source.height, Math.max(startY + 1, Math.ceil(y1)));

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const i = (y * source.width + x) * 3;
      r += source.rgb[i]!;
      g += source.rgb[i + 1]!;
      b += source.rgb[i + 2]!;
      count += 1;
    }
  }

  out[outOffset] = Math.round(r / count);
  out[outOffset + 1] = Math.round(g / count);
  out[outOffset + 2] = Math.round(b / count);
}

/**
 * Cover-fit crop then resize to the display profile dimensions.
 *
 * Downscaling averages the covered source area; upscaling repeats the nearest
 * pixel. Both are deterministic: identical input and crop yield identical bytes.
 */
export function normaliseToProfile(
  source: DecodedImage,
  options: NormaliseToProfileOptions,
): ProfileRgbBuffer {
  const { profile } = options;
  const crop = options.crop ?? DEFAULT_CROP;
  const cropX = clampUnit(crop.x, 'crop.x');
  const cropY = clampUnit(crop.y, 'crop.y');

  if (source.width < 1 || source.height < 1) {
    throw new ImageIngestError('INVALID_IMAGE', 'decoded image has no pixels');
  }

  const targetW = profile.width;
  const targetH = profile.height;
  const scale = Math.max(targetW / source.width, targetH / source.height);
  const cropW = targetW / scale;
  const cropH = targetH / scale;
  const maxOffsetX = Math.max(0, source.width - cropW);
  const maxOffsetY = Math.max(0, source.height - cropH);
  const originX = maxOffsetX * cropX;
  const originY = maxOffsetY * cropY;

  const stepX = cropW / targetW;
  const stepY = cropH / targetH;
  // Averaging only helps when an output pixel covers more than one source pixel.
  const downscaling = stepX > 1 || stepY > 1;

  const rgb = new Uint8Array(targetW * targetH * 3);
  for (let y = 0; y < targetH; y += 1) {
    for (let x = 0; x < targetW; x += 1) {
      const outOffset = (y * targetW + x) * 3;
      if (downscaling) {
        const x0 = originX + x * stepX;
        const y0 = originY + y * stepY;
        sampleAreaAverage(source, x0, y0, x0 + stepX, y0 + stepY, rgb, outOffset);
      } else {
        const sx = originX + (x + 0.5) * stepX - 0.5;
        const sy = originY + (y + 0.5) * stepY - 0.5;
        sampleNearest(source, sx, sy, rgb, outOffset);
      }
    }
  }

  return {
    profileId: profile.id,
    width: targetW,
    height: targetH,
    rgb,
  };
}
