import { ImageIngestError } from './errors.js';
import { assertWithinPixelLimits, resolveLimits, type DecodeLimits } from './limits.js';
import type { DecodedImage } from './types.js';

/** Interleaved RGBA pixels, as produced by `CanvasRenderingContext2D.getImageData`. */
export type RgbaImageData = {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray | Uint8Array;
};

export function rgbaToRgb(rgba: Uint8ClampedArray | Uint8Array, pixelCount: number): Uint8Array {
  const rgb = new Uint8Array(pixelCount * 3);
  for (let i = 0, j = 0; i < pixelCount; i += 1, j += 3) {
    const o = i * 4;
    const a = rgba[o + 3]! / 255;
    // Composite transparent pixels onto white.
    rgb[j] = Math.round(rgba[o]! * a + 255 * (1 - a));
    rgb[j + 1] = Math.round(rgba[o + 1]! * a + 255 * (1 - a));
    rgb[j + 2] = Math.round(rgba[o + 2]! * a + 255 * (1 - a));
  }
  return rgb;
}

/**
 * Ceilings that apply to already-decoded pixels.
 *
 * `maxByteLength` is deliberately excluded: it bounds the size of an *encoded*
 * upload, and comparing it to a decoded RGBA buffer would reject images the
 * Node path accepts — a 2 MB PNG expands to 64 MB of pixels. The pixel and
 * dimension ceilings are what bound memory here.
 */
export type FromRgbaLimits = Partial<Omit<DecodeLimits, 'maxByteLength'>>;

/**
 * Adopt already-decoded RGBA pixels as a `DecodedImage`.
 *
 * The browser entry point into the pipeline: PNG/JPEG decoding there is the
 * platform's job (`createImageBitmap` into a canvas, then `getImageData`),
 * which avoids shipping a decoder to the client. Node callers should use
 * `decodeImage` from `@singleton-sd/inkads-epaper-renderer/node` instead.
 */
export function fromRgbaImageData(
  image: RgbaImageData,
  options: { readonly limits?: FromRgbaLimits } = {},
): DecodedImage {
  const limits = resolveLimits(options.limits);
  assertWithinPixelLimits(image.width, image.height, limits);

  const expected = image.width * image.height * 4;
  if (image.data.length !== expected) {
    throw new ImageIngestError(
      'INVALID_IMAGE',
      `expected ${String(expected)} RGBA bytes for ${String(image.width)}×${String(image.height)}, received ${String(image.data.length)}`,
    );
  }

  return {
    width: image.width,
    height: image.height,
    rgb: rgbaToRgb(image.data, image.width * image.height),
  };
}
