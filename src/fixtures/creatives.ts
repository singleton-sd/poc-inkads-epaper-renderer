import { waveshare75BwProfile } from '../display-profile/index.js';
import { normaliseToProfile } from '../ingest/index.js';
import type { ProfileRgbBuffer } from '../ingest/index.js';
import { createRandom } from './prng.js';

const profile = waveshare75BwProfile;

type Rgb = readonly [number, number, number];

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [17, 17, 17];
const INK: Rgb = [40, 44, 52];
const ACCENT: Rgb = [198, 40, 40];

/** Mutable RGB canvas at profile resolution. */
class Canvas {
  readonly width: number;
  readonly height: number;
  readonly rgb: Uint8Array;

  constructor(width: number, height: number, fill: Rgb) {
    this.width = width;
    this.height = height;
    this.rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i += 1) {
      const o = i * 3;
      this.rgb[o] = fill[0];
      this.rgb[o + 1] = fill[1];
      this.rgb[o + 2] = fill[2];
    }
  }

  set(x: number, y: number, colour: Rgb): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return;
    }
    const o = (y * this.width + x) * 3;
    this.rgb[o] = colour[0];
    this.rgb[o + 1] = colour[1];
    this.rgb[o + 2] = colour[2];
  }

  fillRect(x: number, y: number, w: number, h: number, colour: Rgb): void {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) {
        this.set(x + dx, y + dy, colour);
      }
    }
  }

  strokeRect(x: number, y: number, w: number, h: number, thickness: number, colour: Rgb): void {
    this.fillRect(x, y, w, thickness, colour);
    this.fillRect(x, y + h - thickness, w, thickness, colour);
    this.fillRect(x, y, thickness, h, colour);
    this.fillRect(x + w - thickness, y, thickness, h, colour);
  }

  fillCircle(cx: number, cy: number, radius: number, colour: Rgb): void {
    const r2 = radius * radius;
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          this.set(x, y, colour);
        }
      }
    }
  }

  toProfileBuffer(): ProfileRgbBuffer {
    return { profileId: profile.id, width: this.width, height: this.height, rgb: this.rgb };
  }
}

/**
 * Paragraph-style creative: headline, body lines with varied word runs, and a
 * call-to-action button. Exercises fine dark-on-light detail where dithering
 * modes diverge most.
 */
function textHeavy(): ProfileRgbBuffer {
  const canvas = new Canvas(profile.width, profile.height, WHITE);
  const random = createRandom(0x7ea41);

  canvas.fillRect(48, 40, 520, 26, BLACK);
  canvas.fillRect(48, 76, 360, 26, BLACK);

  let y = 140;
  while (y < 380) {
    let x = 48;
    const limit = 48 + 640;
    while (x < limit) {
      const wordWidth = 24 + Math.floor(random() * 78);
      if (x + wordWidth > limit) {
        break;
      }
      canvas.fillRect(x, y, wordWidth, 9, INK);
      x += wordWidth + 12;
    }
    y += 22;
  }

  canvas.fillRect(48, 404, 220, 44, ACCENT);
  canvas.fillRect(74, 420, 168, 12, WHITE);
  canvas.strokeRect(16, 16, profile.width - 32, profile.height - 32, 3, BLACK);
  return canvas.toProfileBuffer();
}

/**
 * Photograph-like source rendered above profile resolution so the golden also
 * covers the ingest downscale path: smooth per-channel gradients, a bright
 * highlight, and seeded sensor-style noise.
 */
function photograph(): ProfileRgbBuffer {
  const width = 1_600;
  const height = 960;
  const canvas = new Canvas(width, height, WHITE);
  const random = createRandom(0x5eed01);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const v = y / (height - 1);
      const sky = 200 - v * 120;
      const warm = 90 + u * 110;
      const noise = (random() - 0.5) * 26;
      canvas.set(x, y, [
        clampByte(warm + noise),
        clampByte(sky * 0.75 + warm * 0.25 + noise),
        clampByte(sky + noise * 0.5),
      ] as const);
    }
  }

  canvas.fillCircle(1_120, 260, 150, [252, 246, 224]);
  canvas.fillRect(0, 720, width, height - 720, [58, 62, 70]);
  return normaliseToProfile({ width, height, rgb: canvas.rgb }, { profile });
}

/** Horizontal ramp from black to white: the classic dither banding detector. */
function linearGradient(): ProfileRgbBuffer {
  const canvas = new Canvas(profile.width, profile.height, WHITE);
  for (let x = 0; x < profile.width; x += 1) {
    const level = clampByte((x / (profile.width - 1)) * 255);
    canvas.fillRect(x, 0, 1, profile.height, [level, level, level]);
  }
  return canvas.toProfileBuffer();
}

/** Flat brand shapes with hard edges: no mid-tones for dithering to smear. */
function logo(): ProfileRgbBuffer {
  const canvas = new Canvas(profile.width, profile.height, WHITE);
  canvas.fillRect(0, 0, profile.width, 120, BLACK);
  canvas.fillCircle(240, 260, 110, ACCENT);
  canvas.fillCircle(240, 260, 48, WHITE);
  canvas.fillRect(420, 180, 300, 60, INK);
  canvas.fillRect(420, 270, 200, 60, ACCENT);
  canvas.fillRect(420, 360, 260, 60, BLACK);
  return canvas.toProfileBuffer();
}

/**
 * QR-like target: fine 4px modules plus locator squares. High-contrast content
 * where any resampling or dithering drift corrupts scannability.
 */
function qrCode(): ProfileRgbBuffer {
  const canvas = new Canvas(profile.width, profile.height, WHITE);
  const random = createRandom(0x9c0de);
  const module = 4;
  const modules = 100;
  const originX = Math.floor((profile.width - modules * module) / 2);
  const originY = Math.floor((profile.height - modules * module) / 2);

  for (let my = 0; my < modules; my += 1) {
    for (let mx = 0; mx < modules; mx += 1) {
      const dark = random() < 0.5;
      if (dark) {
        canvas.fillRect(originX + mx * module, originY + my * module, module, module, BLACK);
      }
    }
  }

  for (const [mx, my] of [
    [0, 0],
    [modules - 7, 0],
    [0, modules - 7],
  ] as const) {
    const x = originX + mx * module;
    const y = originY + my * module;
    canvas.fillRect(x, y, 7 * module, 7 * module, WHITE);
    canvas.strokeRect(x, y, 7 * module, 7 * module, module, BLACK);
    canvas.fillRect(x + 2 * module, y + 2 * module, 3 * module, 3 * module, BLACK);
  }

  return canvas.toProfileBuffer();
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Named golden fixtures; keys are the identifiers used in `expected.ts`. */
export const CREATIVE_FIXTURES = {
  'text-heavy': textHeavy,
  'photograph-downscaled': photograph,
  'linear-gradient': linearGradient,
  'logo-flat-shapes': logo,
  'qr-high-contrast': qrCode,
} as const satisfies Record<string, () => ProfileRgbBuffer>;

export type CreativeFixtureName = keyof typeof CREATIVE_FIXTURES;
