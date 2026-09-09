import type { DisplayOrientation } from '../display-profile/types.js';

export type OrientedBitmap = {
  readonly pixels: Uint8Array;
  readonly width: number;
  readonly height: number;
};

/**
 * Rotate a 1-bit bitmap clockwise for packing.
 *
 * `rotate-180` keeps dimensions. `rotate-90` / `rotate-270` swap width and
 * height so the packed row stride matches the physical mount while the byte
 * length stays `profile.packedByteLength` (for 800×480 both layouts are 48000).
 */
export function orientPixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  orientation: DisplayOrientation,
): OrientedBitmap {
  if (orientation === 'native') {
    return { pixels, width, height };
  }

  if (orientation === 'rotate-180') {
    const out = new Uint8Array(pixels.length);
    const last = width * height - 1;
    for (let i = 0; i < width * height; i += 1) {
      out[last - i] = pixels[i]!;
    }
    return { pixels: out, width, height };
  }

  const newWidth = height;
  const newHeight = width;
  const out = new Uint8Array(newWidth * newHeight);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = orientation === 'rotate-90' ? height - 1 - y : y;
      const dy = orientation === 'rotate-90' ? x : width - 1 - x;
      out[dy * newWidth + dx] = pixels[y * width + x]!;
    }
  }
  return { pixels: out, width: newWidth, height: newHeight };
}
