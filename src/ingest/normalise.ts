import { ImageIngestError } from './errors.js';
import type {
  CropPosition,
  DecodedImage,
  NormaliseToProfileOptions,
  ProfileRgbBuffer,
  RgbColour,
  SourceRect,
} from './types.js';

const DEFAULT_CROP: CropPosition = { x: 0.5, y: 0.5 };
const DEFAULT_BACKGROUND: RgbColour = { r: 255, g: 255, b: 255 };

function clampUnit(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new ImageIngestError('INVALID_CROP', `${label} must be a finite number`);
  }
  if (value < 0 || value > 1) {
    throw new ImageIngestError('INVALID_CROP', `${label} must be between 0 and 1 inclusive`);
  }
  return value;
}

function validateChannel(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new ImageIngestError(
      'INVALID_CROP',
      `${label} must be an integer between 0 and 255 inclusive`,
    );
  }
  return value;
}

function validateBackground(background: RgbColour): RgbColour {
  return {
    r: validateChannel(background.r, 'background.r'),
    g: validateChannel(background.g, 'background.g'),
    b: validateChannel(background.b, 'background.b'),
  };
}

/**
 * Grow the requested rectangle about its centre until it matches the panel
 * aspect ratio.
 *
 * Growing rather than shrinking guarantees everything the user framed stays
 * visible; the alternative would silently crop a selection they just made.
 * Non-uniform scaling is never an option, since a distorted advert is worse
 * than a letterboxed one.
 */
function correctAspect(rect: SourceRect, targetW: number, targetH: number): SourceRect {
  const targetAspect = targetW / targetH;
  const rectAspect = rect.width / rect.height;
  if (rectAspect === targetAspect) {
    return rect;
  }

  const width = rectAspect < targetAspect ? rect.height * targetAspect : rect.width;
  const height = rectAspect < targetAspect ? rect.height : rect.width / targetAspect;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

function validateSourceRect(rect: SourceRect): SourceRect {
  for (const [label, value] of [
    ['sourceRect.x', rect.x],
    ['sourceRect.y', rect.y],
    ['sourceRect.width', rect.width],
    ['sourceRect.height', rect.height],
  ] as const) {
    if (!Number.isFinite(value)) {
      throw new ImageIngestError('INVALID_CROP', `${label} must be a finite number`);
    }
  }
  if (rect.width <= 0 || rect.height <= 0) {
    throw new ImageIngestError('INVALID_CROP', 'sourceRect width and height must be positive');
  }
  return rect;
}

/** The cover-fit window: the largest region matching the panel aspect ratio. */
function coverFitRect(
  source: DecodedImage,
  crop: CropPosition,
  targetW: number,
  targetH: number,
): SourceRect {
  const cropX = clampUnit(crop.x, 'crop.x');
  const cropY = clampUnit(crop.y, 'crop.y');
  const scale = Math.max(targetW / source.width, targetH / source.height);
  const width = targetW / scale;
  const height = targetH / scale;
  return {
    x: Math.max(0, source.width - width) * cropX,
    y: Math.max(0, source.height - height) * cropY,
    width,
    height,
  };
}

function sampleNearest(
  source: DecodedImage,
  sx: number,
  sy: number,
  background: RgbColour,
  out: Uint8Array,
  outOffset: number,
): void {
  const rx = Math.round(sx);
  const ry = Math.round(sy);
  if (rx < 0 || rx >= source.width || ry < 0 || ry >= source.height) {
    out[outOffset] = background.r;
    out[outOffset + 1] = background.g;
    out[outOffset + 2] = background.b;
    return;
  }
  const i = (ry * source.width + rx) * 3;
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
  background: RgbColour,
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

  // The footprint can hang off the edge of the source when zoomed out, so the
  // uncovered remainder contributes background rather than being ignored.
  // Weighting it keeps the letterbox edge smooth instead of hard-stepped.
  const footprint = (x1 - x0) * (y1 - y0);
  const uncovered = Math.max(0, footprint - totalWeight);
  if (uncovered > 0) {
    r += background.r * uncovered;
    g += background.g * uncovered;
    b += background.b * uncovered;
    totalWeight += uncovered;
  }

  if (totalWeight === 0) {
    out[outOffset] = background.r;
    out[outOffset + 1] = background.g;
    out[outOffset + 2] = background.b;
    return;
  }

  out[outOffset] = Math.round(r / totalWeight);
  out[outOffset + 1] = Math.round(g / totalWeight);
  out[outOffset + 2] = Math.round(b / totalWeight);
}

/**
 * Render a region of the source at the display profile dimensions.
 *
 * By default this cover-fits: the largest centred region matching the panel
 * aspect ratio, which fills the panel but discards whatever falls outside.
 * Pass `sourceRect` to choose the region explicitly, which is what a framing UI
 * does when the user zooms or pans; it may extend past the image to zoom out,
 * and the surrounding area is filled with `background`.
 *
 * Downscaling averages the covered source area; upscaling repeats the nearest
 * pixel. Both are deterministic: identical input and options yield identical
 * bytes.
 */
export function normaliseToProfile(
  source: DecodedImage,
  options: NormaliseToProfileOptions,
): ProfileRgbBuffer {
  const { profile } = options;

  if (options.crop !== undefined && options.sourceRect !== undefined) {
    throw new ImageIngestError(
      'INVALID_CROP',
      'pass either crop or sourceRect, not both: sourceRect already sets the position',
    );
  }
  if (source.width < 1 || source.height < 1) {
    throw new ImageIngestError('INVALID_IMAGE', 'decoded image has no pixels');
  }

  const targetW = profile.width;
  const targetH = profile.height;
  const background = validateBackground(options.background ?? DEFAULT_BACKGROUND);
  const rect =
    options.sourceRect === undefined
      ? coverFitRect(source, options.crop ?? DEFAULT_CROP, targetW, targetH)
      : correctAspect(validateSourceRect(options.sourceRect), targetW, targetH);

  const originX = rect.x;
  const originY = rect.y;
  const stepX = rect.width / targetW;
  const stepY = rect.height / targetH;
  // Each footprint area is stepX * stepY, which can overflow to Infinity even
  // when both steps are finite. The area average would then divide Infinity by
  // Infinity and write NaN, which a Uint8Array stores as 0 — turning a white
  // background silently black instead of failing.
  if (!Number.isFinite(stepX * stepY)) {
    throw new ImageIngestError(
      'INVALID_CROP',
      'sourceRect is too large to sample: width × height overflows',
    );
  }
  // Averaging only helps when an output pixel covers more than one source pixel.
  const downscaling = stepX > 1 || stepY > 1;

  const rgb = new Uint8Array(targetW * targetH * 3);
  for (let y = 0; y < targetH; y += 1) {
    for (let x = 0; x < targetW; x += 1) {
      const outOffset = (y * targetW + x) * 3;
      if (downscaling) {
        const x0 = originX + x * stepX;
        const y0 = originY + y * stepY;
        sampleAreaAverage(source, background, x0, y0, x0 + stepX, y0 + stepY, rgb, outOffset);
      } else {
        const sx = originX + (x + 0.5) * stepX - 0.5;
        const sy = originY + (y + 0.5) * stepY - 0.5;
        sampleNearest(source, sx, sy, background, rgb, outOffset);
      }
    }
  }

  return {
    profileId: profile.id,
    width: targetW,
    height: targetH,
    rgb,
    sourceRect: rect,
  };
}
