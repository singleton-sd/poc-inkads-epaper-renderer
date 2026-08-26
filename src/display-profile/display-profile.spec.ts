import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WAVESHARE_7_5_BW_ID,
  computePackedByteLength,
  defineDisplayProfile,
  DisplayProfileValidationError,
  getDisplayProfile,
  hasDisplayProfile,
  listDisplayProfiles,
  waveshare75BwProfile,
} from './index.js';

describe('computePackedByteLength', () => {
  it('computes 48000 bytes for 800x480 1bpp', () => {
    assert.equal(computePackedByteLength(800, 480, 1), 48_000);
  });

  it('rejects dimensions that overflow to Infinity', () => {
    assert.throws(
      () => computePackedByteLength(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 1),
      DisplayProfileValidationError,
    );
  });
});

describe('defineDisplayProfile', () => {
  it('rejects packed byte length mismatch', () => {
    assert.throws(
      () =>
        defineDisplayProfile({
          id: 'test-panel',
          label: 'Test',
          width: 800,
          height: 480,
          aspectRatio: { width: 5, height: 3 },
          bitsPerPixel: 1,
          pixelPacking: '1bpp-row-major',
          packedByteLength: 47_999,
          orientation: 'native',
          polarity: 'normal',
        }),
      DisplayProfileValidationError,
    );
  });

  it('rejects aspect ratio that does not match dimensions', () => {
    assert.throws(
      () =>
        defineDisplayProfile({
          id: 'test-panel',
          label: 'Test',
          width: 800,
          height: 480,
          aspectRatio: { width: 16, height: 9 },
          bitsPerPixel: 1,
          pixelPacking: '1bpp-row-major',
          packedByteLength: 48_000,
          orientation: 'native',
          polarity: 'normal',
        }),
      DisplayProfileValidationError,
    );
  });

  it('rejects non-positive aspect ratio terms', () => {
    assert.throws(
      () =>
        defineDisplayProfile({
          id: 'test-panel',
          label: 'Test',
          width: 800,
          height: 480,
          aspectRatio: { width: 0, height: 0 },
          bitsPerPixel: 1,
          pixelPacking: '1bpp-row-major',
          packedByteLength: 48_000,
          orientation: 'native',
          polarity: 'normal',
        }),
      DisplayProfileValidationError,
    );
  });

  it('rejects unsupported bit-depth and packing combinations', () => {
    assert.throws(
      () =>
        defineDisplayProfile({
          id: 'test-panel',
          label: 'Test',
          width: 800,
          height: 480,
          aspectRatio: { width: 5, height: 3 },
          bitsPerPixel: 2,
          pixelPacking: '1bpp-row-major',
          packedByteLength: 96_000,
          orientation: 'native',
          polarity: 'normal',
        }),
      DisplayProfileValidationError,
    );
  });
});

describe('waveshare75BwProfile', () => {
  it('matches expected hardware constants', () => {
    assert.equal(waveshare75BwProfile.id, WAVESHARE_7_5_BW_ID);
    assert.equal(waveshare75BwProfile.width, 800);
    assert.equal(waveshare75BwProfile.height, 480);
    assert.equal(waveshare75BwProfile.bitsPerPixel, 1);
    assert.equal(waveshare75BwProfile.packedByteLength, 48_000);
    assert.deepEqual(waveshare75BwProfile.aspectRatio, { width: 5, height: 3 });
  });
});

describe('registry', () => {
  it('lists and resolves the Waveshare profile', () => {
    const profiles = listDisplayProfiles();
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0]?.id, WAVESHARE_7_5_BW_ID);

    assert.equal(hasDisplayProfile(WAVESHARE_7_5_BW_ID), true);
    assert.equal(getDisplayProfile('waveshare-7.5-bw'), waveshare75BwProfile);
  });

  it('throws for unknown profile ids', () => {
    assert.throws(() => getDisplayProfile('unknown-panel'), DisplayProfileValidationError);
  });
});
