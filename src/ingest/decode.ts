import { Buffer } from 'node:buffer';
import { decode as decodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';

import { ImageIngestError } from './errors.js';
import {
  assertWithinByteLimit,
  assertWithinPixelLimits,
  resolveLimits,
  type DecodeLimits,
} from './limits.js';
import { rgbaToRgb } from './rgba.js';
import type { DecodedImage } from './types.js';

function toUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
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

/** PNG IHDR puts width and height at fixed offsets, ahead of the pixel data. */
function readPngHeaderSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Walk JPEG markers to the first frame header (SOFn) for its dimensions. */
function readJpegHeaderSize(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }
    const marker = bytes[offset + 1]!;
    const segmentLength = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    // SOF0–SOF15, excluding the non-frame markers DHT (0xc4), JPG (0xc8), DAC (0xcc).
    const isFrameHeader =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader) {
      const height = (bytes[offset + 5]! << 8) | bytes[offset + 6]!;
      const width = (bytes[offset + 7]! << 8) | bytes[offset + 8]!;
      return { width, height };
    }
    if (segmentLength < 2) {
      return null;
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function decodePng(bytes: Uint8Array, limits: DecodeLimits): DecodedImage {
  const header = readPngHeaderSize(bytes);
  if (header) {
    assertWithinPixelLimits(header.width, header.height, limits);
  }

  let png: PNG;
  try {
    png = PNG.sync.read(Buffer.from(bytes));
  } catch (error) {
    throw new ImageIngestError(
      'INVALID_PNG',
      error instanceof Error ? error.message : 'failed to decode PNG',
    );
  }

  assertWithinPixelLimits(png.width, png.height, limits);
  return {
    width: png.width,
    height: png.height,
    rgb: rgbaToRgb(png.data, png.width * png.height),
  };
}

function decodeJpegBytes(bytes: Uint8Array, limits: DecodeLimits): DecodedImage {
  const header = readJpegHeaderSize(bytes);
  if (header) {
    assertWithinPixelLimits(header.width, header.height, limits);
  }

  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    decoded = decodeJpeg(bytes, { useTArray: true, maxMemoryUsageInMB: 512 });
  } catch (error) {
    throw new ImageIngestError(
      'INVALID_JPEG',
      error instanceof Error ? error.message : 'failed to decode JPEG',
    );
  }

  assertWithinPixelLimits(decoded.width, decoded.height, limits);
  return {
    width: decoded.width,
    height: decoded.height,
    rgb: rgbaToRgb(decoded.data, decoded.width * decoded.height),
  };
}

export type DecodeImageOptions = {
  /** Override the ceilings applied to untrusted uploads. */
  readonly limits?: Partial<DecodeLimits>;
};

/**
 * Decode PNG or JPEG bytes into an RGB buffer.
 *
 * Input is treated as untrusted: size limits are checked against the file
 * header before the decoder allocates pixels. See `DEFAULT_DECODE_LIMITS`.
 */
export function decodeImage(
  input: ArrayBuffer | Uint8Array,
  options: DecodeImageOptions = {},
): DecodedImage {
  const bytes = toUint8Array(input);
  if (bytes.length === 0) {
    throw new ImageIngestError('EMPTY_INPUT', 'image input is empty');
  }

  const limits = resolveLimits(options.limits);
  assertWithinByteLimit(bytes.length, limits);

  const format = sniffFormat(bytes);
  if (format === 'png') {
    return decodePng(bytes, limits);
  }
  if (format === 'jpeg') {
    return decodeJpegBytes(bytes, limits);
  }

  throw new ImageIngestError('UNSUPPORTED_FORMAT', 'only PNG and JPEG inputs are supported');
}
