import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WAVESHARE_7_5_BW_ID } from '../display-profile/index.js';
import { MonoRenderError, renderMono, rgbToLuma } from './index.js';
import type { MonoSource } from './types.js';

function solid(width: number, height: number, rgb: [number, number, number]): MonoSource {
  const buf = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 3;
    buf[o] = rgb[0];
    buf[o + 1] = rgb[1];
    buf[o + 2] = rgb[2];
  }
  return {
    profileId: WAVESHARE_7_5_BW_ID,
    width,
    height,
    rgb: buf,
  };
}

function checker(width: number, height: number): MonoSource {
  const buf = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = (x + y) % 2 === 0 ? 0 : 255;
      const o = (y * width + x) * 3;
      buf[o] = v;
      buf[o + 1] = v;
      buf[o + 2] = v;
    }
  }
  return {
    profileId: WAVESHARE_7_5_BW_ID,
    width,
    height,
    rgb: buf,
  };
}

describe('rgbToLuma', () => {
  it('maps pure channels with Rec. 601 weights', () => {
    assert.equal(rgbToLuma(255, 0, 0), Math.round(0.299 * 255));
    assert.equal(rgbToLuma(0, 255, 0), Math.round(0.587 * 255));
    assert.equal(rgbToLuma(0, 0, 255), Math.round(0.114 * 255));
  });
});

describe('renderMono', () => {
  it('threshold maps mid-grey with default cut-off', () => {
    const dark = renderMono(solid(2, 2, [100, 100, 100]), { mode: 'threshold' });
    const light = renderMono(solid(2, 2, [200, 200, 200]), { mode: 'threshold' });
    assert.deepEqual([...dark.pixels], [0, 0, 0, 0]);
    assert.deepEqual([...light.pixels], [1, 1, 1, 1]);
    assert.equal(dark.mode, 'threshold');
  });

  it('threshold respects a custom cut-off', () => {
    const source = solid(1, 1, [100, 100, 100]);
    assert.equal(renderMono(source, { mode: 'threshold', threshold: 100 }).pixels[0], 1);
    assert.equal(renderMono(source, { mode: 'threshold', threshold: 101 }).pixels[0], 0);
  });

  it('is deterministic for identical inputs across modes', () => {
    const source = checker(8, 4);
    for (const mode of ['threshold', 'floyd-steinberg', 'atkinson'] as const) {
      const a = renderMono(source, { mode });
      const b = renderMono(source, { mode });
      assert.deepEqual(a.pixels, b.pixels);
      assert.equal(a.width, 8);
      assert.equal(a.height, 4);
      assert.equal(a.pixels.length, 32);
    }
  });

  it('error-diffusion modes diverge from pure threshold on mid greys', () => {
    // Horizontal gradient — FS/Atkinson should not be a hard vertical cut like threshold.
    const width = 16;
    const height = 4;
    const rgb = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const g = Math.round((x / (width - 1)) * 255);
        const o = (y * width + x) * 3;
        rgb[o] = g;
        rgb[o + 1] = g;
        rgb[o + 2] = g;
      }
    }
    const source: MonoSource = {
      profileId: WAVESHARE_7_5_BW_ID,
      width,
      height,
      rgb,
    };
    const thr = renderMono(source, { mode: 'threshold' });
    const fs = renderMono(source, { mode: 'floyd-steinberg' });
    const at = renderMono(source, { mode: 'atkinson' });
    assert.notDeepEqual(fs.pixels, thr.pixels);
    assert.notDeepEqual(at.pixels, thr.pixels);
    assert.notDeepEqual(fs.pixels, at.pixels);
  });

  it('rejects invalid rgb length', () => {
    assert.throws(
      () =>
        renderMono(
          { profileId: WAVESHARE_7_5_BW_ID, width: 2, height: 2, rgb: new Uint8Array(3) },
          { mode: 'threshold' },
        ),
      (error: unknown) => {
        assert.ok(error instanceof MonoRenderError);
        assert.equal(error.code, 'INVALID_RGB_LENGTH');
        return true;
      },
    );
  });

  it('rejects invalid threshold', () => {
    assert.throws(
      () => renderMono(solid(1, 1, [0, 0, 0]), { mode: 'threshold', threshold: 256 }),
      MonoRenderError,
    );
  });
});
