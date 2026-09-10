import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { waveshare75BwProfile } from '../display-profile/index.js';
import {
  clampFraming,
  coverWindowSize,
  defaultFraming,
  framingPanRoom,
  nextSourceRotation,
  rotatedImageSize,
  sourceRectFromFraming,
} from './framing.js';
import { normaliseToProfile } from './normalise.js';

const profile = waveshare75BwProfile;
const image = { width: 1600, height: 960 };
const MIN_ZOOM = 0.05;

describe('rotatedImageSize', () => {
  it('swaps dimensions for 90 and 270', () => {
    assert.deepEqual(rotatedImageSize(image, 90), { width: 960, height: 1600 });
    assert.deepEqual(rotatedImageSize(image, 270), { width: 960, height: 1600 });
  });

  it('keeps dimensions for 0 and 180', () => {
    assert.deepEqual(rotatedImageSize(image, 0), image);
    assert.deepEqual(rotatedImageSize(image, 180), image);
  });
});

describe('nextSourceRotation', () => {
  it('cycles clockwise in 90° steps', () => {
    assert.equal(nextSourceRotation(0), 90);
    assert.equal(nextSourceRotation(90), 180);
    assert.equal(nextSourceRotation(180), 270);
    assert.equal(nextSourceRotation(270), 0);
  });
});

describe('coverWindowSize / defaultFraming / sourceRectFromFraming', () => {
  it('cover-fit at zoom 1 matches centred default framing', () => {
    const framing = defaultFraming(image);
    const cover = coverWindowSize(image, profile);
    const rect = sourceRectFromFraming(image, framing, profile);
    assert.equal(framing.zoom, 1);
    assert.equal(rect.width, cover.width);
    assert.equal(rect.height, cover.height);
    assert.equal(rect.x, (image.width - cover.width) / 2);
    assert.equal(rect.y, (image.height - cover.height) / 2);
  });

  it('zooms in by shrinking the source window about the centre', () => {
    const framing = { ...defaultFraming(image), zoom: 2 };
    const cover = coverWindowSize(image, profile);
    const rect = sourceRectFromFraming(image, framing, profile);
    assert.equal(rect.width, cover.width / 2);
    assert.equal(rect.height, cover.height / 2);
  });
});

describe('clampFraming', () => {
  it('keeps a zoomed-in window inside the image', () => {
    const framing = clampFraming(image, { centerX: -500, centerY: 5000, zoom: 2 }, profile);
    const rect = sourceRectFromFraming(image, framing, profile);
    assert.ok(rect.x >= 0);
    assert.ok(rect.y >= 0);
    assert.ok(rect.x + rect.width <= image.width + 1e-9);
    assert.ok(rect.y + rect.height <= image.height + 1e-9);
  });

  it('allows offset letterboxing when zoomed out past the image', () => {
    const framing = clampFraming(image, { centerX: 0, centerY: 0, zoom: 0.25 }, profile);
    const rect = sourceRectFromFraming(image, framing, profile);
    // Full image stays inside the window; centre is not forced to mid-point.
    assert.ok(rect.x <= 0);
    assert.ok(rect.y <= 0);
    assert.ok(rect.x + rect.width >= image.width - 1e-9);
    assert.ok(rect.y + rect.height >= image.height - 1e-9);
    assert.notEqual(framing.centerX, image.width / 2);
    assert.notEqual(framing.centerY, image.height / 2);
  });

  it('keeps the full image inside the window when letterboxed', () => {
    const framing = clampFraming(image, { centerX: -10_000, centerY: 10_000, zoom: 0.25 }, profile);
    const rect = sourceRectFromFraming(image, framing, profile);
    assert.ok(rect.x <= 0 + 1e-9);
    assert.ok(rect.y <= 0 + 1e-9);
    assert.ok(rect.x + rect.width >= image.width - 1e-9);
    assert.ok(rect.y + rect.height >= image.height - 1e-9);
  });

  it('returns the floor zoom used for geometry', () => {
    const framing = clampFraming(image, { ...defaultFraming(image), zoom: 0.01 }, profile);
    assert.equal(framing.zoom, MIN_ZOOM);
    const rect = sourceRectFromFraming(image, framing, profile);
    const atFloor = sourceRectFromFraming(
      image,
      { ...defaultFraming(image), zoom: MIN_ZOOM },
      profile,
    );
    assert.deepEqual(rect, atFloor);
  });
});

describe('framingPanRoom', () => {
  it('reports no room on a filled axis at cover-fit', () => {
    // Exact panel aspect: cover window equals the image — no pan either way.
    const panelSized = { width: 800, height: 480 };
    const room = framingPanRoom(panelSized, defaultFraming(panelSized), profile);
    assert.equal(room.west, 0);
    assert.equal(room.east, 0);
    assert.equal(room.north, 0);
    assert.equal(room.south, 0);
  });

  it('reports horizontal room for a wide image at cover-fit', () => {
    const wide = { width: 1920, height: 1080 };
    const room = framingPanRoom(wide, defaultFraming(wide), profile);
    assert.ok(room.east > 0);
    assert.ok(room.west > 0);
    assert.equal(room.north, 0);
    assert.equal(room.south, 0);
  });

  it('reports room when letterboxed so the image can be offset', () => {
    const room = framingPanRoom(image, { ...defaultFraming(image), zoom: 0.5 }, profile);
    assert.ok(room.east > 0);
    assert.ok(room.west > 0);
    assert.ok(room.north > 0);
    assert.ok(room.south > 0);
  });
});

describe('rotated framing through normaliseToProfile', () => {
  it('applies helper sourceRect in post-rotation coordinates', () => {
    const rgb = new Uint8Array(480 * 800 * 3).fill(128);
    const source = { width: 480, height: 800, rgb };
    const size = rotatedImageSize({ width: 480, height: 800 }, 90);
    const framing = clampFraming(size, { ...defaultFraming(size), zoom: 2 }, profile);
    const rect = sourceRectFromFraming(size, framing, profile);

    const viaHelpers = normaliseToProfile(source, {
      profile,
      rotation: 90,
      sourceRect: rect,
    });
    const viaZoom = normaliseToProfile(source, {
      profile,
      rotation: 90,
      zoom: framing.zoom,
      centerX: framing.centerX,
      centerY: framing.centerY,
    });

    assert.deepEqual(viaHelpers.sourceRect, viaZoom.sourceRect);
    assert.deepEqual(viaHelpers.rgb, viaZoom.rgb);
  });
});
