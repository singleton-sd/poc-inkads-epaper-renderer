import { WAVESHARE_7_5_BW_ID } from '../ids.js';
import { defineDisplayProfile } from '../validate.js';
import type { DisplayProfile } from '../types.js';

/**
 * Waveshare 7.5″ black-and-white e-paper (800×480, 1 bpp, 48 000 bytes).
 *
 * Orientation and polarity defaults are provisional until physical validation
 * (issues #8 / firmware #22).
 */
export const waveshare75BwProfile: DisplayProfile = defineDisplayProfile({
  id: WAVESHARE_7_5_BW_ID,
  label: 'Waveshare 7.5″ B/W (800×480)',
  width: 800,
  height: 480,
  aspectRatio: { width: 5, height: 3 },
  bitsPerPixel: 1,
  pixelPacking: '1bpp-row-major',
  packedByteLength: 48_000,
  orientation: 'native',
  polarity: 'normal',
});
