import { Buffer } from 'node:buffer';
import { decode as decodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';

import { ImageIngestError } from './errors.js';
import type { DecodedImage } from './types.js';

function toUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function rgbaToRgb(rgba: Uint8Array, pixelCount: number): Uint8Array {
  const rgb = new Uint8Array(pixelCount * 3);
  for (let i = 0, j = 0; i < pixelCount; i += 1, j += 3) {
    const o = i * 4;
    const a = rgba[o + 3]! / 255;
    // Composite transparent pixels onto white.
    rgb[j] = Math.round(rgba[o]! * a + 255 * (1 - a));
    rgb[j + 1] = Math.round(rgba[o + 1]! * a + 255 * (1 - a));
    rgb[j + 2] = Math.round(rgba[o + 2]! * a + 255 * (1 - a));
  }
  return rgb;
}

function sniffFormat(bytes: Uint8Array): 'png' | 'jpeg' | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  return null;
}

function decodePng(bytes: Uint8Array): DecodedImage {
  let png: PNG;
  try {
    png = PNG.sync.read(Buffer.from(bytes));
  } catch (error) {
    throw new ImageIngestError(
      'INVALID_PNG',
      error instanceof Error ? error.message : 'failed to decode PNG',
    );
  }

  return {
    width: png.width,
    height: png.height,
    rgb: rgbaToRgb(png.data, png.width * png.height),
  };
}

function decodeJpegBytes(bytes: Uint8Array): DecodedImage {
  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    decoded = decodeJpeg(bytes, { useTArray: true });
  } catch (error) {
    throw new ImageIngestError(
      'INVALID_JPEG',
      error instanceof Error ? error.message : 'failed to decode JPEG',
    );
  }

  return {
    width: decoded.width,
    height: decoded.height,
    rgb: rgbaToRgb(decoded.data, decoded.width * decoded.height),
  };
}

/**
 * Decode PNG or JPEG bytes into an RGB buffer.
 * Accepts raw `ArrayBuffer` / `Uint8Array` for Node and browser consumers.
 */
export function decodeImage(input: ArrayBuffer | Uint8Array): DecodedImage {
  const bytes = toUint8Array(input);
  if (bytes.length === 0) {
    throw new ImageIngestError('EMPTY_INPUT', 'image input is empty');
  }

  const format = sniffFormat(bytes);
  if (format === 'png') {
    return decodePng(bytes);
  }
  if (format === 'jpeg') {
    return decodeJpegBytes(bytes);
  }

  throw new ImageIngestError('UNSUPPORTED_FORMAT', 'only PNG and JPEG inputs are supported');
}
