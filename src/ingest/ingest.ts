import { decodeImage, type DecodeImageOptions } from './decode.js';
import type { NormaliseToProfileOptions, ProfileRgbBuffer } from './types.js';
import { normaliseToProfile } from './normalise.js';

/**
 * Decode PNG/JPEG bytes and normalise to the target display profile size.
 */
export function ingestImageToProfile(
  input: ArrayBuffer | Uint8Array,
  options: NormaliseToProfileOptions & DecodeImageOptions,
): ProfileRgbBuffer {
  const decoded = decodeImage(input, { ...(options.limits ? { limits: options.limits } : {}) });
  return normaliseToProfile(decoded, options);
}
