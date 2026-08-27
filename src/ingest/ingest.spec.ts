import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encode as encodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';

import {
  DEFAULT_DECODE_LIMITS,
  ImageIngestError,
  decodeImage,
  ingestImageToProfile,
  normaliseToProfile,
} from './index.js';
import { waveshare75BwProfile } from '../display-profile/index.js';

function solidPng(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    png.data[o] = rgb[0];
    png.data[o + 1] = rgb[1];
    png.data[o + 2] = rgb[2];
    png.data[o + 3] = 255;
  }
  return Uint8Array.from(PNG.sync.write(png));
}

function solidJpeg(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    data[o] = rgb[0];
    data[o + 1] = rgb[1];
    data[o + 2] = rgb[2];
    data[o + 3] = 255;
  }
  const encoded = encodeJpeg({ data, width, height }, 90);
  return Uint8Array.from(encoded.data);
}

/** Left half red, right half blue — for verifying crop.x. */
function horizontalSplitRgb(
  width: number,
  height: number,
): {
  width: number;
  height: number;
  rgb: Uint8Array;
} {
  const rgb = new Uint8Array(width * height * 3);
  const mid = Math.floor(width / 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 3;
      if (x < mid) {
        rgb[o] = 255;
        rgb[o + 1] = 0;
        rgb[o + 2] = 0;
      } else {
        rgb[o] = 0;
        rgb[o + 1] = 0;
        rgb[o + 2] = 255;
      }
    }
  }
  return { width, height, rgb };
}

/** Top half green, bottom half magenta — for verifying crop.y. */
function verticalSplitRgb(
  width: number,
  height: number,
): {
  width: number;
  height: number;
  rgb: Uint8Array;
} {
  const rgb = new Uint8Array(width * height * 3);
  const mid = Math.floor(height / 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 3;
      if (y < mid) {
        rgb[o] = 0;
        rgb[o + 1] = 255;
        rgb[o + 2] = 0;
      } else {
        rgb[o] = 255;
        rgb[o + 1] = 0;
        rgb[o + 2] = 255;
      }
    }
  }
  return { width, height, rgb };
}

function centrePixel(buffer: { width: number; height: number; rgb: Uint8Array }): number[] {
  const x = Math.floor(buffer.width / 2);
  const y = Math.floor(buffer.height / 2);
  const o = (y * buffer.width + x) * 3;
  return [buffer.rgb[o]!, buffer.rgb[o + 1]!, buffer.rgb[o + 2]!];
}

describe('decodeImage', () => {
  it('decodes a PNG into RGB', () => {
    const bytes = solidPng(2, 2, [10, 20, 30]);
    const image = decodeImage(bytes);
    assert.equal(image.width, 2);
    assert.equal(image.height, 2);
    assert.equal(image.rgb.length, 12);
    assert.deepEqual([...image.rgb.slice(0, 3)], [10, 20, 30]);
  });

  it('decodes a JPEG into RGB', () => {
    const bytes = solidJpeg(4, 4, [200, 100, 50]);
    const image = decodeImage(bytes);
    assert.equal(image.width, 4);
    assert.equal(image.height, 4);
    assert.equal(image.rgb.length, 48);
  });

  it('rejects unsupported formats', () => {
    assert.throws(
      () => decodeImage(Uint8Array.from([0, 1, 2, 3])),
      (error: unknown) => {
        assert.ok(error instanceof ImageIngestError);
        assert.equal(error.code, 'UNSUPPORTED_FORMAT');
        return true;
      },
    );
  });

  it('rejects a PNG whose header exceeds the pixel limit', () => {
    // Header claims 30000×30000 (~3.6 GB decoded) but carries no pixel data,
    // so this only passes if the guard runs before decoding.
    const bytes = solidPng(2, 2, [0, 0, 0]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setUint32(16, 30_000);
    view.setUint32(20, 30_000);
    assert.throws(
      () => decodeImage(bytes),
      (error: unknown) => {
        assert.ok(error instanceof ImageIngestError);
        assert.equal(error.code, 'IMAGE_TOO_LARGE');
        return true;
      },
    );
  });

  it('rejects input larger than the byte limit', () => {
    const bytes = solidPng(64, 64, [1, 2, 3]);
    assert.throws(
      () => decodeImage(bytes, { limits: { maxByteLength: 8 } }),
      (error: unknown) => {
        assert.ok(error instanceof ImageIngestError);
        assert.equal(error.code, 'INPUT_TOO_LARGE');
        return true;
      },
    );
  });

  it('honours a caller-supplied pixel limit', () => {
    const bytes = solidPng(64, 64, [1, 2, 3]);
    assert.throws(
      () => decodeImage(bytes, { limits: { maxPixels: 100 } }),
      (error: unknown) => {
        assert.ok(error instanceof ImageIngestError);
        assert.equal(error.code, 'IMAGE_TOO_LARGE');
        return true;
      },
    );
    assert.doesNotThrow(() => decodeImage(bytes));
  });

  it('applies limits through ingestImageToProfile', () => {
    assert.throws(
      () =>
        ingestImageToProfile(solidPng(64, 64, [1, 2, 3]), {
          profile: waveshare75BwProfile,
          limits: { maxPixels: 100 },
        }),
      ImageIngestError,
    );
  });

  it('defaults leave realistic creatives untouched', () => {
    assert.ok(DEFAULT_DECODE_LIMITS.maxPixels > 800 * 480);
    assert.doesNotThrow(() => decodeImage(solidJpeg(64, 64, [10, 20, 30])));
  });

  it('rejects empty input', () => {
    assert.throws(
      () => decodeImage(new Uint8Array()),
      (error: unknown) => {
        assert.ok(error instanceof ImageIngestError);
        assert.equal(error.code, 'EMPTY_INPUT');
        return true;
      },
    );
  });
});

describe('normaliseToProfile', () => {
  it('resizes cover-fit to Waveshare 800x480', () => {
    const source = decodeImage(solidPng(100, 100, [0, 128, 255]));
    const result = normaliseToProfile(source, { profile: waveshare75BwProfile });
    assert.equal(result.width, 800);
    assert.equal(result.height, 480);
    assert.equal(result.rgb.length, 800 * 480 * 3);
    assert.equal(result.profileId, waveshare75BwProfile.id);
  });

  it('is deterministic for the same input and crop', () => {
    const source = decodeImage(solidPng(64, 32, [40, 50, 60]));
    const a = normaliseToProfile(source, {
      profile: waveshare75BwProfile,
      crop: { x: 0.25, y: 0.75 },
    });
    const b = normaliseToProfile(source, {
      profile: waveshare75BwProfile,
      crop: { x: 0.25, y: 0.75 },
    });
    assert.deepEqual(a.rgb, b.rgb);
  });

  it('selects expected sides for crop.x 0 vs 1 on a wide source', () => {
    // 1600×480 → scale 1, horizontal pan only (exact profile height).
    const source = horizontalSplitRgb(1600, 480);
    const left = normaliseToProfile(source, {
      profile: waveshare75BwProfile,
      crop: { x: 0, y: 0.5 },
    });
    const right = normaliseToProfile(source, {
      profile: waveshare75BwProfile,
      crop: { x: 1, y: 0.5 },
    });
    assert.deepEqual(centrePixel(left), [255, 0, 0]);
    assert.deepEqual(centrePixel(right), [0, 0, 255]);
    assert.notDeepEqual(left.rgb, right.rgb);
  });

  it('selects expected sides for crop.y 0 vs 1 on a tall source', () => {
    // 800×960 → scale 1, vertical pan only (exact profile width).
    const source = verticalSplitRgb(800, 960);
    const top = normaliseToProfile(source, {
      profile: waveshare75BwProfile,
      crop: { x: 0.5, y: 0 },
    });
    const bottom = normaliseToProfile(source, {
      profile: waveshare75BwProfile,
      crop: { x: 0.5, y: 1 },
    });
    assert.deepEqual(centrePixel(top), [0, 255, 0]);
    assert.deepEqual(centrePixel(bottom), [255, 0, 255]);
    assert.notDeepEqual(top.rgb, bottom.rgb);
  });

  it('rejects crop offsets outside 0..1', () => {
    const source = decodeImage(solidPng(8, 8, [1, 2, 3]));
    assert.throws(
      () =>
        normaliseToProfile(source, {
          profile: waveshare75BwProfile,
          crop: { x: 1.5, y: 0.5 },
        }),
      ImageIngestError,
    );
  });
});

describe('ingestImageToProfile', () => {
  it('decodes PNG and normalises in one step', () => {
    const result = ingestImageToProfile(solidPng(50, 80, [9, 9, 9]), {
      profile: waveshare75BwProfile,
    });
    assert.equal(result.width, 800);
    assert.equal(result.height, 480);
  });
});
