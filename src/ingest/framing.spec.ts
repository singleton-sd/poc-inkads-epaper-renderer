import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { waveshare75BwProfile } from '../display-profile/index.js';
import {
  clampFraming,
  coverWindowSize,
  defaultFraming,
  nextSourceRotation,
  rotatedImageSize,
  sourceRectFromFraming,
} from './framing.js';

const profile = waveshare75BwProfile;
const image = { width: 1600, height: 960 };

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

  it('pins the centre when zoomed out past the image', () => {
    const framing = clampFraming(image, { centerX: 0, centerY: 0, zoom: 0.25 }, profile);
    assert.equal(framing.centerX, image.width / 2);
    assert.equal(framing.centerY, image.height / 2);
  });
});
