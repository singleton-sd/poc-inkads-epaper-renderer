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
 * Cover-fit crop then resize to the display profile dimensions.
 * Deterministic nearest-neighbour sampling for identical outputs across runs.
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

  const rgb = new Uint8Array(targetW * targetH * 3);
  for (let y = 0; y < targetH; y += 1) {
    for (let x = 0; x < targetW; x += 1) {
      const sx = originX + ((x + 0.5) * cropW) / targetW - 0.5;
      const sy = originY + ((y + 0.5) * cropH) / targetH - 0.5;
      sampleNearest(source, sx, sy, rgb, (y * targetW + x) * 3);
    }
  }

  return {
    profileId: profile.id,
    width: targetW,
    height: targetH,
    rgb,
  };
}
