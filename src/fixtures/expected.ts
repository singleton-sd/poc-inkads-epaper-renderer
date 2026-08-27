import type { MonoRenderMode } from '../mono/index.js';
import type { CreativeFixtureName } from './creatives.js';

/**
 * CRC32 of the packed framebuffer bytes for every fixture × mono mode.
 *
 * The checksum covers packed bytes only, never metadata, so a renderer version
 * bump must not change these values. Any other diff here is a pixel-level
 * renderer change and needs a deliberate review.
 *
 * Purely bi-level fixtures leave no quantisation error to diffuse, so their
 * `threshold` and `atkinson` digests legitimately match.
 */
export const EXPECTED_CHECKSUMS: Record<CreativeFixtureName, Record<MonoRenderMode, string>> = {
  'text-heavy': {
    threshold: '8a0a748a',
    'floyd-steinberg': 'f9e251cc',
    atkinson: 'a29d2dbe',
  },
  'photograph-downscaled': {
    threshold: 'ee1b7983',
    'floyd-steinberg': '792c1479',
    atkinson: '12be66b2',
  },
  'linear-gradient': {
    threshold: 'fa49b6b0',
    'floyd-steinberg': '10dbef0a',
    atkinson: 'e7fa2ae6',
  },
  'logo-flat-shapes': {
    threshold: '4e2a7922',
    'floyd-steinberg': '19fb5b42',
    atkinson: '648ec96e',
  },
  'qr-high-contrast': {
    threshold: '86ea48ed',
    'floyd-steinberg': '82dafd4f',
    atkinson: '86ea48ed',
  },
};
