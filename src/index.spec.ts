import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as root from './index.js';
import * as node from './node.js';

/**
 * The exact runtime surface each entry point promises.
 *
 * Consumers pin to these names, so both an accidental addition (an internal
 * helper leaking out and becoming load-bearing for someone) and an accidental
 * removal are breaking. Updating these lists is the deliberate step that makes
 * such a change visible in review.
 */
const ROOT_EXPORTS = [
  'DEFAULT_DECODE_LIMITS',
  'DisplayProfileValidationError',
  'FramebufferPackError',
  'ImageIngestError',
  'MonoRenderError',
  'RENDERER_VERSION',
  'WAVESHARE_7_5_BW_ID',
  'assertAspectRatioMatchesDimensions',
  'computePackedByteLength',
  'crc32Hex',
  'defineDisplayProfile',
  'fromRgbaImageData',
  'getDisplayProfile',
  'hasDisplayProfile',
  'listDisplayProfiles',
  'normaliseToProfile',
  'packMonoBitmap',
  'renderMono',
  'rgbToLuma',
  'toPreviewImage',
  'waveshare75BwProfile',
];

const NODE_EXPORTS = ['decodeImage', 'encodePreviewPng', 'ingestImageToProfile'];

describe('public API surface', () => {
  it('exports exactly the documented names from the root entry point', () => {
    assert.deepEqual(Object.keys(root).sort(), ROOT_EXPORTS);
  });

  it('exports exactly the documented names from the node entry point', () => {
    assert.deepEqual(Object.keys(node).sort(), NODE_EXPORTS);
  });

  it('keeps the two entry points disjoint', () => {
    const shared = NODE_EXPORTS.filter((name) => ROOT_EXPORTS.includes(name));
    assert.deepEqual(shared, []);
  });
});
