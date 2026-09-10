import type { DisplayProfile } from '../display-profile/types.js';
import { FramebufferPackError } from './errors.js';

/** Row-major packing geometry after applying `profile.orientation`. */
export type PackLayout = {
  readonly width: number;
  readonly height: number;
  readonly bytesPerRow: number;
};

/**
 * Framebuffer dimensions used when packing / unpacking for this orientation.
 *
 * Logical artwork is always `profile.width × profile.height`. For
 * `rotate-90` / `rotate-270` the packed rows use the swapped size so firmware
 * can address a portrait mount while `packedByteLength` stays the same when
 * both edges are multiples of 8 (as on Waveshare 800×480).
 */
export function layoutForOrientation(profile: DisplayProfile): PackLayout {
  const { orientation } = profile;
  switch (orientation) {
    case 'native':
    case 'rotate-90':
    case 'rotate-180':
    case 'rotate-270':
      break;
    default:
      throw new FramebufferPackError(
        'UNSUPPORTED_ORIENTATION',
        `orientation ${String(orientation)} is not supported`,
      );
  }

  const swapped = orientation === 'rotate-90' || orientation === 'rotate-270';
  const width = swapped ? profile.height : profile.width;
  const height = swapped ? profile.width : profile.height;

  if (profile.pixelPacking !== '1bpp-row-major' || profile.bitsPerPixel !== 1) {
    throw new FramebufferPackError(
      'UNSUPPORTED_PACKING',
      `profile ${profile.id} uses unsupported packing ${profile.pixelPacking}@${profile.bitsPerPixel}bpp`,
    );
  }
  if (width % 8 !== 0) {
    throw new FramebufferPackError(
      'UNSUPPORTED_PACKING',
      `pack layout width ${width} must be a multiple of 8 for row-major 1bpp packing` +
        (swapped ? ` (profile height ${profile.height} under ${profile.orientation})` : ''),
    );
  }

  const bytesPerRow = width / 8;
  const expectedPackedByteLength = bytesPerRow * height;
  if (profile.packedByteLength !== expectedPackedByteLength) {
    throw new FramebufferPackError(
      'PACKED_LENGTH_MISMATCH',
      `profile declares ${profile.packedByteLength} packed bytes but ${width}×${height} layout needs ${expectedPackedByteLength}`,
    );
  }

  return { width, height, bytesPerRow };
}

/**
 * Bytes per packed row, after checking the profile can be packed at all.
 *
 * `defineDisplayProfile` rounds the packed size up, so it accepts widths that
 * are not a multiple of 8 and declared lengths that disagree with the
 * dimensions. Either would give a fractional row stride and corrupt every row
 * offset, so both packing and preview decoding go through this guard.
 */
export function bytesPerRowFor(profile: DisplayProfile): number {
  return layoutForOrientation(profile).bytesPerRow;
}
