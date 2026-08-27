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
  fromRgbaImageData,
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

  it('rejects malformed limit overrides instead of disabling the guard', () => {
    const bytes = solidPng(8, 8, [0, 0, 0]);
    for (const limits of [
      { maxPixels: 0 },
      { maxPixels: -1 },
      { maxByteLength: Number.NaN },
      { maxDimension: 1.5 },
      { maxPixels: Number.POSITIVE_INFINITY },
    ]) {
      assert.throws(
        () => decodeImage(bytes, { limits }),
        (error: unknown) => {
          assert.ok(error instanceof ImageIngestError);
          assert.equal(error.code, 'INVALID_LIMITS');
          return true;
        },
        `expected ${JSON.stringify(limits)} to be rejected`,
      );
    }
  });

  it('exposes frozen defaults so callers cannot weaken them globally', () => {
    assert.ok(Object.isFrozen(DEFAULT_DECODE_LIMITS));
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

  it('averages source pixels when downscaling instead of sampling one', () => {
    // 1-pixel vertical stripes: nearest-neighbour would return pure black or
    // pure white, area averaging returns mid grey.
    const width = 1600;
    const height = 960;
    const rgb = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const v = x % 2 === 0 ? 0 : 255;
        const o = (y * width + x) * 3;
        rgb[o] = v;
        rgb[o + 1] = v;
        rgb[o + 2] = v;
      }
    }
    const result = normaliseToProfile({ width, height, rgb }, { profile: waveshare75BwProfile });
    for (const channel of centrePixel(result)) {
      assert.ok(
        channel > 100 && channel < 155,
        `expected an averaged mid grey, got ${String(channel)}`,
      );
    }
  });

  it('weights partially covered pixels at fractional ratios', () => {
    // 1200×720 → 800×480 is a 1.5× footprint, so every second output pixel
    // straddles a stripe boundary. Equal weighting would bias those samples.
    const width = 1200;
    const height = 720;
    const rgb = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const v = x % 2 === 0 ? 0 : 255;
        const o = (y * width + x) * 3;
        rgb[o] = v;
        rgb[o + 1] = v;
        rgb[o + 2] = v;
      }
    }
    const result = normaliseToProfile({ width, height, rgb }, { profile: waveshare75BwProfile });

    // Each 1.5px footprint covers one stripe fully and the next by half, so
    // the weighted mean is 255/3 or 510/3 — never the flat 128 that equal
    // weighting produces.
    const row = 10;
    const shades: number[] = [];
    for (let x = 0; x < 4; x += 1) {
      shades.push(result.rgb[(row * 800 + x) * 3]!);
    }
    assert.deepEqual(shades, [85, 85, 170, 170]);
  });

  it('stays deterministic when downscaling', () => {
    const width = 1600;
    const height = 960;
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < rgb.length; i += 1) {
      rgb[i] = (i * 37) % 256;
    }
    const source = { width, height, rgb };
    const a = normaliseToProfile(source, { profile: waveshare75BwProfile });
    const b = normaliseToProfile(source, { profile: waveshare75BwProfile });
    assert.deepEqual(a.rgb, b.rgb);
  });

  it('still uses nearest-neighbour when upscaling', () => {
    // 2×2 black/white blocks upscaled: output must stay pure, never blended.
    const source = horizontalSplitRgb(2, 2);
    const result = normaliseToProfile(source, { profile: waveshare75BwProfile });
    const shades = new Set<string>();
    for (let i = 0; i < result.rgb.length; i += 3) {
      shades.add(
        `${String(result.rgb[i])},${String(result.rgb[i + 1])},${String(result.rgb[i + 2])}`,
      );
    }
    assert.deepEqual([...shades].sort(), ['0,0,255', '255,0,0']);
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

describe('normaliseToProfile sourceRect', () => {
  const profile = waveshare75BwProfile;

  /** Solid mid-grey source, so background fill is unambiguous. */
  function greySource(width: number, height: number) {
    const rgb = new Uint8Array(width * height * 3).fill(128);
    return { width, height, rgb };
  }

  function pixelAt(result: { rgb: Uint8Array }, x: number, y: number): number[] {
    const o = (y * 800 + x) * 3;
    return [result.rgb[o]!, result.rgb[o + 1]!, result.rgb[o + 2]!];
  }

  it('reports the cover-fit rectangle it applied by default', () => {
    const result = normaliseToProfile(greySource(1600, 1600), { profile });
    // 5:3 window inside a square: full width, centred vertically.
    assert.deepEqual(result.sourceRect, { x: 0, y: 320, width: 1600, height: 960 });
  });

  it('zooms in on the requested region', () => {
    // Red left half, blue right half. Framing one half must fill the panel
    // with that half alone, which pan-only cropping cannot do.
    const source = horizontalSplitRgb(800, 480);
    const left = normaliseToProfile(source, {
      profile,
      sourceRect: { x: 0, y: 0, width: 400, height: 240 },
    });
    const right = normaliseToProfile(source, {
      profile,
      sourceRect: { x: 400, y: 240, width: 400, height: 240 },
    });
    assert.deepEqual(pixelAt(left, 400, 240), [255, 0, 0]);
    assert.deepEqual(pixelAt(left, 780, 20), [255, 0, 0]);
    assert.deepEqual(pixelAt(right, 400, 240), [0, 0, 255]);
  });

  it('letterboxes with background when zoomed out past the image', () => {
    // Three times the source in each axis, centred on it: the image occupies
    // the middle third of the panel and background surrounds it.
    const result = normaliseToProfile(greySource(800, 480), {
      profile,
      sourceRect: { x: -800, y: -480, width: 2400, height: 1440 },
    });
    assert.deepEqual(pixelAt(result, 5, 240), [255, 255, 255]);
    assert.deepEqual(pixelAt(result, 795, 240), [255, 255, 255]);
    assert.deepEqual(pixelAt(result, 400, 240), [128, 128, 128]);
  });

  it('fills the letterbox with a caller-supplied background', () => {
    const result = normaliseToProfile(greySource(800, 480), {
      profile,
      sourceRect: { x: -800, y: -480, width: 2400, height: 1440 },
      background: { r: 0, g: 0, b: 0 },
    });
    assert.deepEqual(pixelAt(result, 5, 240), [0, 0, 0]);
  });

  it('grows a mismatched rectangle instead of distorting it', () => {
    // A square selection cannot fill a 5:3 panel. Widening keeps the whole
    // selection visible; squashing it vertically would distort the artwork.
    const result = normaliseToProfile(greySource(1000, 1000), {
      profile,
      sourceRect: { x: 200, y: 200, width: 600, height: 600 },
    });
    assert.equal(result.sourceRect.height, 600);
    assert.equal(result.sourceRect.width, 1000);
    assert.equal(result.sourceRect.y, 200);
    // Grown about the centre, so the original selection is still inside it.
    assert.equal(result.sourceRect.x, 0);
    assert.ok(result.sourceRect.x <= 200);
    assert.ok(result.sourceRect.x + result.sourceRect.width >= 800);
  });

  it('is deterministic for the same rectangle', () => {
    const source = greySource(1200, 700);
    const rect = { x: 10.5, y: 20.25, width: 500, height: 300 };
    const a = normaliseToProfile(source, { profile, sourceRect: rect });
    const b = normaliseToProfile(source, { profile, sourceRect: rect });
    assert.deepEqual(a.rgb, b.rgb);
  });

  it('rejects supplying both crop and sourceRect', () => {
    assert.throws(
      () =>
        normaliseToProfile(greySource(100, 100), {
          profile,
          crop: { x: 0, y: 0 },
          sourceRect: { x: 0, y: 0, width: 50, height: 30 },
        }),
      (error: unknown) => error instanceof ImageIngestError && error.code === 'INVALID_CROP',
    );
  });

  it('rejects a degenerate or non-finite rectangle', () => {
    for (const rect of [
      { x: 0, y: 0, width: 0, height: 10 },
      { x: 0, y: 0, width: 10, height: -5 },
      { x: Number.NaN, y: 0, width: 10, height: 6 },
    ]) {
      assert.throws(
        () => normaliseToProfile(greySource(100, 100), { profile, sourceRect: rect }),
        (error: unknown) => error instanceof ImageIngestError && error.code === 'INVALID_CROP',
      );
    }
  });

  it('rejects an out-of-range background channel', () => {
    assert.throws(
      () =>
        normaliseToProfile(greySource(100, 100), { profile, background: { r: 256, g: 0, b: 0 } }),
      (error: unknown) => error instanceof ImageIngestError && error.code === 'INVALID_CROP',
    );
  });
});

describe('fromRgbaImageData', () => {
  function rgbaCanvasPixels(width: number, height: number, rgba: readonly number[]) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i += 1) {
      data.set(rgba, i * 4);
    }
    return { width, height, data };
  }

  it('adopts opaque canvas pixels as RGB', () => {
    const decoded = fromRgbaImageData(rgbaCanvasPixels(4, 3, [10, 20, 30, 255]));
    assert.equal(decoded.width, 4);
    assert.equal(decoded.height, 3);
    assert.equal(decoded.rgb.length, 4 * 3 * 3);
    assert.deepEqual([...decoded.rgb.slice(0, 3)], [10, 20, 30]);
  });

  it('composites transparency onto white, matching decodeImage', () => {
    const decoded = fromRgbaImageData(rgbaCanvasPixels(1, 1, [0, 0, 0, 0]));
    assert.deepEqual([...decoded.rgb], [255, 255, 255]);
  });

  it('rejects a buffer that does not match the stated dimensions', () => {
    assert.throws(
      () => fromRgbaImageData({ width: 4, height: 4, data: new Uint8ClampedArray(8) }),
      (error: unknown) => error instanceof ImageIngestError && error.code === 'INVALID_IMAGE',
    );
  });

  it('does not accept an encoded-size ceiling it cannot enforce', () => {
    // @ts-expect-error maxByteLength bounds encoded uploads, not decoded pixels.
    fromRgbaImageData(rgbaCanvasPixels(1, 1, [0, 0, 0, 255]), { limits: { maxByteLength: 1 } });
  });

  it('applies the same pixel ceilings as decodeImage', () => {
    assert.throws(
      () => fromRgbaImageData(rgbaCanvasPixels(4, 4, [0, 0, 0, 255]), { limits: { maxPixels: 4 } }),
      (error: unknown) => error instanceof ImageIngestError && error.code === 'IMAGE_TOO_LARGE',
    );
  });
});
