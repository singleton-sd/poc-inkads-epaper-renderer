import type { DisplayOrientation } from '../display-profile/types.js';
import { FramebufferPackError } from './errors.js';

export type OrientedBitmap = {
  readonly pixels: Uint8Array;
  readonly width: number;
  readonly height: number;
};

function assertKnownOrientation(orientation: DisplayOrientation): void {
  switch (orientation) {
    case 'native':
    case 'rotate-90':
    case 'rotate-180':
    case 'rotate-270':
      return;
    default: {
      throw new FramebufferPackError(
        'UNSUPPORTED_ORIENTATION',
        `orientation ${String(orientation)} is not supported`,
      );
    }
  }
}

/**
 * Rotate a 1-bit bitmap clockwise for packing.
 *
 * `rotate-180` keeps dimensions. `rotate-90` / `rotate-270` swap width and
 * height so the packed row stride matches the physical mount while the byte
 * length stays `profile.packedByteLength` (for 800×480 both layouts are 48000).
 *
 * Unknown orientation values (e.g. from a hand-built / deserialized profile)
 * throw rather than falling through to the wrong remap — that would disagree
 * with {@link layoutForOrientation} and corrupt the framebuffer.
 */
export function orientPixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  orientation: DisplayOrientation,
): OrientedBitmap {
  assertKnownOrientation(orientation);

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
  const clockwise90 = orientation === 'rotate-90';
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = clockwise90 ? height - 1 - y : y;
      const dy = clockwise90 ? x : width - 1 - x;
      out[dy * newWidth + dx] = pixels[y * width + x]!;
    }
  }
  return { pixels: out, width: newWidth, height: newHeight };
}
