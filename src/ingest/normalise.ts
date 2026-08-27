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
 * Average the source pixels covered by one output pixel, weighting each by how
 * much of it the output footprint actually overlaps.
 *
 * Nearest-neighbour discards almost all source pixels when downscaling a
 * multi-megapixel upload, and the dither stage turns that aliasing into
 * visible noise. Footprints are rarely integral — 1200×720 into 800×480 is
 * 1.5 source pixels per output pixel — so edge pixels must contribute in
 * proportion to their coverage. Summing in fixed order keeps this
 * deterministic.
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
  const left = Math.max(0, x0);
  const top = Math.max(0, y0);
  const right = Math.min(source.width, x1);
  const bottom = Math.min(source.height, y1);
  const startX = Math.min(source.width - 1, Math.floor(left));
  const startY = Math.min(source.height - 1, Math.floor(top));
  const endX = Math.max(startX + 1, Math.ceil(right));
  const endY = Math.max(startY + 1, Math.ceil(bottom));

  let r = 0;
  let g = 0;
  let b = 0;
  let totalWeight = 0;
  for (let y = startY; y < endY; y += 1) {
    const rowOverlap = Math.min(y + 1, bottom) - Math.max(y, top);
    if (rowOverlap <= 0) {
      continue;
    }
    for (let x = startX; x < endX; x += 1) {
      const columnOverlap = Math.min(x + 1, right) - Math.max(x, left);
      if (columnOverlap <= 0) {
        continue;
      }
      const weight = rowOverlap * columnOverlap;
      const i = (y * source.width + x) * 3;
      r += source.rgb[i]! * weight;
      g += source.rgb[i + 1]! * weight;
      b += source.rgb[i + 2]! * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    sampleNearest(source, (left + right) / 2 - 0.5, (top + bottom) / 2 - 0.5, out, outOffset);
    return;
  }

  out[outOffset] = Math.round(r / totalWeight);
  out[outOffset + 1] = Math.round(g / totalWeight);
  out[outOffset + 2] = Math.round(b / totalWeight);
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
