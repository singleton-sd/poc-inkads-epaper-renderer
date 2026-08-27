import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { defineDisplayProfile, waveshare75BwProfile } from '../display-profile/index.js';
import { decodeImage } from '../ingest/index.js';
import { renderMono } from '../mono/index.js';
import { RENDERER_VERSION } from '../version.js';
import {
  crc32Hex,
  encodePreviewPng,
  FramebufferPackError,
  packMonoBitmap,
  toPreviewImage,
} from './index.js';
import type { PackSource } from './types.js';

const profile = waveshare75BwProfile;

function bitmapOf(fill: (x: number, y: number) => 0 | 1): PackSource {
  const pixels = new Uint8Array(profile.width * profile.height);
  for (let y = 0; y < profile.height; y += 1) {
    for (let x = 0; x < profile.width; x += 1) {
      pixels[y * profile.width + x] = fill(x, y);
    }
  }
  return {
    profileId: profile.id,
    width: profile.width,
    height: profile.height,
    mode: 'threshold',
    pixels,
  };
}

describe('crc32Hex', () => {
  it('matches the known IEEE check value', () => {
    assert.equal(crc32Hex(new TextEncoder().encode('123456789')), 'cbf43926');
  });

  it('returns 8 hex characters for an empty buffer', () => {
    assert.equal(crc32Hex(new Uint8Array()), '00000000');
  });
});

describe('packMonoBitmap', () => {
  it('always produces the profile packed length', () => {
    const packed = packMonoBitmap(
      bitmapOf(() => 1),
      { profile },
    );
    assert.equal(packed.bytes.length, 48_000);
    assert.equal(packed.metadata.byteLength, 48_000);
  });

  it('sets bits for dark pixels under normal polarity', () => {
    const allWhite = packMonoBitmap(
      bitmapOf(() => 1),
      { profile },
    );
    const allBlack = packMonoBitmap(
      bitmapOf(() => 0),
      { profile },
    );
    assert.equal(allWhite.bytes[0], 0x00);
    assert.equal(allBlack.bytes[0], 0xff);
  });

  it('packs the leftmost pixel into the most significant bit', () => {
    const packed = packMonoBitmap(
      bitmapOf((x) => (x === 0 ? 0 : 1)),
      { profile },
    );
    assert.equal(packed.bytes[0], 0x80);
    assert.equal(packed.bytes[1], 0x00);
  });

  it('inverts bit meaning for inverted polarity', () => {
    const inverted = defineDisplayProfile({ ...profile, polarity: 'inverted' });
    const packed = packMonoBitmap(
      bitmapOf(() => 0),
      { profile: inverted },
    );
    assert.equal(packed.bytes[0], 0x00);
  });

  it('produces a stable checksum for identical framebuffers', () => {
    const source = bitmapOf((x, y) => (((x >> 5) + (y >> 5)) % 2 === 0 ? 0 : 1));
    const a = packMonoBitmap(source, { profile });
    const b = packMonoBitmap(source, { profile });
    assert.equal(a.metadata.checksum, b.metadata.checksum);
    assert.notEqual(
      a.metadata.checksum,
      packMonoBitmap(
        bitmapOf(() => 1),
        { profile },
      ).metadata.checksum,
    );
  });

  it('records profile and renderer provenance', () => {
    const packed = packMonoBitmap(
      bitmapOf(() => 1),
      { profile },
    );
    assert.equal(packed.metadata.profileId, profile.id);
    assert.equal(packed.metadata.rendererVersion, RENDERER_VERSION);
    assert.equal(packed.metadata.width, 800);
    assert.equal(packed.metadata.height, 480);
    assert.equal(packed.metadata.mode, 'threshold');
    assert.equal(packed.metadata.pixelPacking, '1bpp-row-major');
  });

  it('accepts an explicit renderer version', () => {
    const packed = packMonoBitmap(
      bitmapOf(() => 1),
      { profile, rendererVersion: '9.9.9' },
    );
    assert.equal(packed.metadata.rendererVersion, '9.9.9');
  });

  it('rejects a bitmap from another profile', () => {
    const source = { ...bitmapOf(() => 1), profileId: 'other-panel' as typeof profile.id };
    assert.throws(
      () => packMonoBitmap(source, { profile }),
      (error: unknown) => {
        assert.ok(error instanceof FramebufferPackError);
        assert.equal(error.code, 'PROFILE_MISMATCH');
        return true;
      },
    );
  });

  it('rejects a width that is not byte-aligned', () => {
    // computePackedByteLength rounds up, so a 100px-wide profile is valid but
    // would give a fractional 12.5 bytes per row here.
    const misaligned = defineDisplayProfile({
      ...profile,
      label: 'Misaligned',
      width: 100,
      height: 60,
      aspectRatio: { width: 5, height: 3 },
      packedByteLength: 750,
    });
    const source: PackSource = {
      profileId: misaligned.id,
      width: 100,
      height: 60,
      mode: 'threshold',
      pixels: new Uint8Array(100 * 60),
    };
    assert.throws(
      () => packMonoBitmap(source, { profile: misaligned }),
      (error: unknown) => {
        assert.ok(error instanceof FramebufferPackError);
        assert.equal(error.code, 'UNSUPPORTED_PACKING');
        return true;
      },
    );
  });

  it('rejects a profile whose packedByteLength contradicts its dimensions', () => {
    // Bypasses defineDisplayProfile the way a hand-built profile object would.
    const inconsistent = { ...profile, packedByteLength: 1_000 };
    assert.throws(
      () =>
        packMonoBitmap(
          bitmapOf(() => 1),
          { profile: inconsistent },
        ),
      (error: unknown) => {
        assert.ok(error instanceof FramebufferPackError);
        assert.equal(error.code, 'PACKED_LENGTH_MISMATCH');
        return true;
      },
    );
  });

  it('rejects unimplemented orientations', () => {
    const rotated = defineDisplayProfile({ ...profile, orientation: 'rotate-90' });
    assert.throws(
      () =>
        packMonoBitmap(
          bitmapOf(() => 1),
          { profile: rotated },
        ),
      (error: unknown) => {
        assert.ok(error instanceof FramebufferPackError);
        assert.equal(error.code, 'UNSUPPORTED_ORIENTATION');
        return true;
      },
    );
  });
});

describe('toPreviewImage', () => {
  it('round-trips the packed result rather than the source artwork', () => {
    const source = bitmapOf((x) => (x < 8 ? 0 : 1));
    const packed = packMonoBitmap(source, { profile });
    const preview = toPreviewImage(packed, profile);
    assert.equal(preview.width, 800);
    assert.equal(preview.height, 480);
    assert.equal(preview.data.length, 800 * 480 * 4);
    assert.deepEqual([...preview.data.slice(0, 4)], [0, 0, 0, 255]);
    assert.deepEqual([...preview.data.slice(8 * 4, 8 * 4 + 4)], [255, 255, 255, 255]);
  });

  it('rejects a profile that differs only in polarity', () => {
    // Same id and byte length, but rendering it would invert every shade.
    const packed = packMonoBitmap(
      bitmapOf(() => 1),
      { profile },
    );
    const inverted = defineDisplayProfile({ ...profile, polarity: 'inverted' });
    assert.throws(
      () => toPreviewImage(packed, inverted),
      (error: unknown) => {
        assert.ok(error instanceof FramebufferPackError);
        assert.equal(error.code, 'PROFILE_MISMATCH');
        return true;
      },
    );
  });

  it('rejects a rotated profile rather than previewing it as native', () => {
    const rotated = defineDisplayProfile({ ...profile, orientation: 'rotate-90' });
    const packed = packMonoBitmap(
      bitmapOf(() => 1),
      { profile },
    );
    const rotatedMetadata = {
      bytes: packed.bytes,
      metadata: { ...packed.metadata, orientation: rotated.orientation },
    };
    assert.throws(
      () => toPreviewImage(rotatedMetadata, rotated),
      (error: unknown) => {
        assert.ok(error instanceof FramebufferPackError);
        assert.equal(error.code, 'UNSUPPORTED_ORIENTATION');
        return true;
      },
    );
  });

  it('encodes a PNG that decodes back to the same shades', () => {
    const packed = packMonoBitmap(
      bitmapOf((x) => (x < 8 ? 0 : 1)),
      { profile },
    );
    const png = encodePreviewPng(toPreviewImage(packed, profile));
    const decoded = decodeImage(png);
    assert.equal(decoded.width, 800);
    assert.equal(decoded.height, 480);
    assert.deepEqual([...decoded.rgb.slice(0, 3)], [0, 0, 0]);
    assert.deepEqual([...decoded.rgb.slice(8 * 3, 8 * 3 + 3)], [255, 255, 255]);
  });
});

describe('renderMono → packMonoBitmap', () => {
  it('packs a rendered bitmap to the device length', () => {
    const rgb = new Uint8Array(profile.width * profile.height * 3).fill(20);
    const bitmap = renderMono(
      { profileId: profile.id, width: profile.width, height: profile.height, rgb },
      { mode: 'atkinson' },
    );
    const packed = packMonoBitmap(bitmap, { profile });
    assert.equal(packed.bytes.length, profile.packedByteLength);
    assert.equal(packed.metadata.mode, 'atkinson');
  });
});

describe('RENDERER_VERSION', () => {
  it('matches the package manifest', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { version: string };
    assert.equal(RENDERER_VERSION, manifest.version);
  });
});
