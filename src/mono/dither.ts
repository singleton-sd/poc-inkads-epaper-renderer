import { MonoRenderError } from './errors.js';
import { buildLumaBuffer } from './grayscale.js';
import type { MonoBitmap, MonoRenderMode, MonoSource, RenderMonoOptions } from './types.js';

const MODES: ReadonlySet<MonoRenderMode> = new Set(['threshold', 'floyd-steinberg', 'atkinson']);

function validateSource(source: MonoSource): void {
  if (
    !Number.isInteger(source.width) ||
    !Number.isInteger(source.height) ||
    source.width < 1 ||
    source.height < 1
  ) {
    throw new MonoRenderError('INVALID_DIMENSIONS', 'width and height must be positive integers');
  }
  const expected = source.width * source.height * 3;
  if (source.rgb.length !== expected) {
    throw new MonoRenderError(
      'INVALID_RGB_LENGTH',
      `rgb length ${source.rgb.length} does not match ${source.width}×${source.height}×3`,
    );
  }
}

function quantize(value: number): { bit: 0 | 1; error: number } {
  const bit: 0 | 1 = value >= 128 ? 1 : 0;
  const target = bit === 1 ? 255 : 0;
  return { bit, error: value - target };
}

function diffuse(
  buffer: Float64Array,
  width: number,
  height: number,
  x: number,
  y: number,
  error: number,
  dx: number,
  dy: number,
  weight: number,
): void {
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
    return;
  }
  const i = ny * width + nx;
  buffer[i] = buffer[i]! + error * weight;
}

function renderThreshold(luma: Float64Array, threshold: number): Uint8Array {
  const pixels = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i += 1) {
    pixels[i] = luma[i]! >= threshold ? 1 : 0;
  }
  return pixels;
}

function renderFloydSteinberg(luma: Float64Array, width: number, height: number): Uint8Array {
  const work = Float64Array.from(luma);
  const pixels = new Uint8Array(work.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const { bit, error } = quantize(work[i]!);
      pixels[i] = bit;
      // Serpentine-free classic FS (deterministic left→right, top→bottom).
      diffuse(work, width, height, x, y, error, 1, 0, 7 / 16);
      diffuse(work, width, height, x, y, error, -1, 1, 3 / 16);
      diffuse(work, width, height, x, y, error, 0, 1, 5 / 16);
      diffuse(work, width, height, x, y, error, 1, 1, 1 / 16);
    }
  }
  return pixels;
}

function renderAtkinson(luma: Float64Array, width: number, height: number): Uint8Array {
  const work = Float64Array.from(luma);
  const pixels = new Uint8Array(work.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const { bit, error } = quantize(work[i]!);
      pixels[i] = bit;
      // Atkinson distributes 1/8 to six neighbours (keeps more contrast for UI/text).
      const share = error / 8;
      diffuse(work, width, height, x, y, share, 1, 0, 1);
      diffuse(work, width, height, x, y, share, 2, 0, 1);
      diffuse(work, width, height, x, y, share, -1, 1, 1);
      diffuse(work, width, height, x, y, share, 0, 1, 1);
      diffuse(work, width, height, x, y, share, 1, 1, 1);
      diffuse(work, width, height, x, y, share, 0, 2, 1);
    }
  }
  return pixels;
}

/**
 * Convert a profile-sized RGB buffer to a 1-bit monochrome bitmap.
 *
 * Mode trade-offs:
 * - `threshold` — sharpest edges; best for text, logos, and QR codes
 * - `atkinson` — softer than FS, retains local contrast (good UI/illustrations)
 * - `floyd-steinberg` — fullest grey simulation; can soften fine text
 */
export function renderMono(source: MonoSource, options: RenderMonoOptions): MonoBitmap {
  validateSource(source);
  const { mode } = options;
  if (!MODES.has(mode)) {
    throw new MonoRenderError('INVALID_MODE', `unsupported mono render mode: ${String(mode)}`);
  }

  let threshold = 128;
  if (options.threshold !== undefined) {
    if (!Number.isInteger(options.threshold) || options.threshold < 0 || options.threshold > 255) {
      throw new MonoRenderError(
        'INVALID_THRESHOLD',
        'threshold must be an integer between 0 and 255 inclusive',
      );
    }
    threshold = options.threshold;
  }

  const luma = buildLumaBuffer(source.width, source.height, source.rgb);
  let pixels: Uint8Array;
  switch (mode) {
    case 'threshold':
      pixels = renderThreshold(luma, threshold);
      break;
    case 'floyd-steinberg':
      pixels = renderFloydSteinberg(luma, source.width, source.height);
      break;
    case 'atkinson':
      pixels = renderAtkinson(luma, source.width, source.height);
      break;
  }

  return {
    profileId: source.profileId,
    width: source.width,
    height: source.height,
    mode,
    pixels,
  };
}
