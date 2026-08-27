import type { DisplayProfile } from '../display-profile/types.js';
import { FramebufferPackError } from './errors.js';

/**
 * Bytes per packed row, after checking the profile can be packed at all.
 *
 * `defineDisplayProfile` rounds the packed size up, so it accepts widths that
 * are not a multiple of 8 and declared lengths that disagree with the
 * dimensions. Either would give a fractional row stride and corrupt every row
 * offset, so both packing and preview decoding go through this guard.
 */
export function bytesPerRowFor(profile: DisplayProfile): number {
  if (profile.pixelPacking !== '1bpp-row-major' || profile.bitsPerPixel !== 1) {
    throw new FramebufferPackError(
      'UNSUPPORTED_PACKING',
      `profile ${profile.id} uses unsupported packing ${profile.pixelPacking}@${profile.bitsPerPixel}bpp`,
    );
  }
  if (profile.width % 8 !== 0) {
    throw new FramebufferPackError(
      'UNSUPPORTED_PACKING',
      `profile width ${profile.width} must be a multiple of 8 for row-major 1bpp packing`,
    );
  }

  const bytesPerRow = profile.width / 8;
  const expectedPackedByteLength = bytesPerRow * profile.height;
  if (profile.packedByteLength !== expectedPackedByteLength) {
    throw new FramebufferPackError(
      'PACKED_LENGTH_MISMATCH',
      `profile declares ${profile.packedByteLength} packed bytes but ${profile.width}×${profile.height} needs ${expectedPackedByteLength}`,
    );
  }

  return bytesPerRow;
}
