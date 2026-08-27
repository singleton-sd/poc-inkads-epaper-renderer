import { PNG } from 'pngjs';

import type { DisplayProfile } from '../display-profile/types.js';
import { FramebufferPackError } from './errors.js';
import type { PackedFramebuffer } from './types.js';

/** RGBA pixels ready for `new ImageData(preview.data, preview.width, ...)`. */
export type PreviewImage = {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
};

function assertMatchesProfile(packed: PackedFramebuffer, profile: DisplayProfile): void {
  // Every field below changes how bits map to shades, so an id match alone is
  // not enough: a profile differing only in polarity would invert the preview.
  const { metadata } = packed;
  if (
    metadata.profileId !== profile.id ||
    metadata.width !== profile.width ||
    metadata.height !== profile.height ||
    metadata.bitsPerPixel !== profile.bitsPerPixel ||
    metadata.pixelPacking !== profile.pixelPacking ||
    metadata.orientation !== profile.orientation ||
    metadata.polarity !== profile.polarity
  ) {
    throw new FramebufferPackError(
      'PROFILE_MISMATCH',
      `framebuffer metadata (${metadata.profileId}) does not match profile ${profile.id}`,
    );
  }
  if (profile.orientation !== 'native') {
    throw new FramebufferPackError(
      'UNSUPPORTED_ORIENTATION',
      `orientation ${profile.orientation} is not implemented yet`,
    );
  }
  if (packed.bytes.length !== profile.packedByteLength) {
    throw new FramebufferPackError(
      'PACKED_LENGTH_MISMATCH',
      `framebuffer is ${packed.bytes.length} bytes, profile expects ${profile.packedByteLength}`,
    );
  }
}

/**
 * Expand a packed framebuffer back to RGBA for on-screen preview.
 *
 * Derived from the packed bytes rather than the source artwork, so the preview
 * shows exactly what the panel will render.
 */
export function toPreviewImage(packed: PackedFramebuffer, profile: DisplayProfile): PreviewImage {
  assertMatchesProfile(packed, profile);

  const bytesPerRow = profile.width / 8;
  const data = new Uint8ClampedArray(profile.width * profile.height * 4);
  const darkBitIsSet = profile.polarity === 'normal';

  for (let y = 0; y < profile.height; y += 1) {
    for (let x = 0; x < profile.width; x += 1) {
      const byte = packed.bytes[y * bytesPerRow + (x >> 3)]!;
      const bitSet = (byte & (0x80 >> (x & 7))) !== 0;
      const shade = bitSet === darkBitIsSet ? 0 : 255;
      const o = (y * profile.width + x) * 4;
      data[o] = shade;
      data[o + 1] = shade;
      data[o + 2] = shade;
      data[o + 3] = 255;
    }
  }

  return { width: profile.width, height: profile.height, data };
}

/** Encode the preview as PNG bytes for consumers that store or serve a file. */
export function encodePreviewPng(preview: PreviewImage): Uint8Array {
  const png = new PNG({ width: preview.width, height: preview.height });
  png.data = Buffer.from(preview.data.buffer, preview.data.byteOffset, preview.data.length);
  return Uint8Array.from(PNG.sync.write(png));
}
