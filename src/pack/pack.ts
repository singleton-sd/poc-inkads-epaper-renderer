import type { DisplayProfile } from '../display-profile/types.js';
import { RENDERER_VERSION } from '../version.js';
import { crc32Hex } from './crc32.js';
import { FramebufferPackError } from './errors.js';
import type { PackMonoBitmapOptions, PackSource, PackedFramebuffer } from './types.js';

function validate(source: PackSource, profile: DisplayProfile): void {
  if (source.profileId !== profile.id) {
    throw new FramebufferPackError(
      'PROFILE_MISMATCH',
      `bitmap profile ${source.profileId} does not match ${profile.id}`,
    );
  }
  if (source.width !== profile.width || source.height !== profile.height) {
    throw new FramebufferPackError(
      'INVALID_BITMAP',
      `bitmap ${source.width}×${source.height} does not match profile ${profile.width}×${profile.height}`,
    );
  }
  if (source.pixels.length !== profile.width * profile.height) {
    throw new FramebufferPackError(
      'INVALID_BITMAP',
      `pixel count ${source.pixels.length} does not match ${profile.width}×${profile.height}`,
    );
  }
  if (profile.pixelPacking !== '1bpp-row-major' || profile.bitsPerPixel !== 1) {
    throw new FramebufferPackError(
      'UNSUPPORTED_PACKING',
      `profile ${profile.id} uses unsupported packing ${profile.pixelPacking}@${profile.bitsPerPixel}bpp`,
    );
  }
  if (profile.orientation !== 'native') {
    // Rotations stay unimplemented until physical validation (issue #8).
    throw new FramebufferPackError(
      'UNSUPPORTED_ORIENTATION',
      `orientation ${profile.orientation} is not implemented yet`,
    );
  }
}

/**
 * Pack a monochrome bitmap into the device-ready framebuffer.
 *
 * Layout matches the firmware contract: row-major, 8 pixels per byte, MSB is
 * the leftmost pixel. With `polarity: 'normal'` a set bit means a dark pixel,
 * which is the inverse of `MonoBitmap.pixels` (where `1` is white).
 */
export function packMonoBitmap(
  source: PackSource,
  options: PackMonoBitmapOptions,
): PackedFramebuffer {
  const { profile } = options;
  validate(source, profile);

  const bytesPerRow = profile.width / 8;
  const bytes = new Uint8Array(profile.packedByteLength);
  const darkBitIsSet = profile.polarity === 'normal';

  for (let y = 0; y < profile.height; y += 1) {
    for (let xByte = 0; xByte < bytesPerRow; xByte += 1) {
      let byteValue = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        const x = xByte * 8 + bit;
        const isDark = source.pixels[y * profile.width + x] === 0;
        if (isDark === darkBitIsSet) {
          byteValue |= 0x80 >> bit;
        }
      }
      bytes[y * bytesPerRow + xByte] = byteValue;
    }
  }

  if (bytes.length !== profile.packedByteLength) {
    throw new FramebufferPackError(
      'PACKED_LENGTH_MISMATCH',
      `packed ${bytes.length} bytes, profile expects ${profile.packedByteLength}`,
    );
  }

  return {
    bytes,
    metadata: {
      profileId: profile.id,
      rendererVersion: options.rendererVersion ?? RENDERER_VERSION,
      width: profile.width,
      height: profile.height,
      mode: source.mode,
      bitsPerPixel: profile.bitsPerPixel,
      pixelPacking: profile.pixelPacking,
      orientation: profile.orientation,
      polarity: profile.polarity,
      byteLength: bytes.length,
      checksum: crc32Hex(bytes),
    },
  };
}
