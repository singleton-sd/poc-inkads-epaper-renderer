import { decodeImage } from './decode.js';
import type { NormaliseToProfileOptions, ProfileRgbBuffer } from './types.js';
import { normaliseToProfile } from './normalise.js';

/**
 * Decode PNG/JPEG bytes and normalise to the target display profile size.
 */
export function ingestImageToProfile(
  input: ArrayBuffer | Uint8Array,
  options: NormaliseToProfileOptions,
): ProfileRgbBuffer {
  const decoded = decodeImage(input);
  return normaliseToProfile(decoded, options);
}
