import { ImageIngestError } from './errors.js';

/**
 * Ceilings applied to untrusted advertiser uploads.
 *
 * Decoding allocates roughly `width * height * 4` bytes before any downscale to
 * the profile, so an unbounded image is a memory-exhaustion vector on the
 * backend. Callers may raise or lower these per deployment.
 */
export type DecodeLimits = {
  /** Maximum decoded pixels (width × height). */
  readonly maxPixels: number;
  /** Maximum encoded input size in bytes. */
  readonly maxByteLength: number;
  /** Maximum length of either dimension. */
  readonly maxDimension: number;
};

/** ~50 megapixels and 32 MiB: far above any realistic 800×480 creative. */
export const DEFAULT_DECODE_LIMITS: DecodeLimits = Object.freeze({
  maxPixels: 50_000_000,
  maxByteLength: 32 * 1024 * 1024,
  maxDimension: 20_000,
});

function assertPositiveInteger(value: number, field: keyof DecodeLimits): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ImageIngestError(
      'INVALID_LIMITS',
      `${field} must be a positive safe integer, received ${String(value)}`,
    );
  }
}

/**
 * Merge caller overrides onto the defaults and validate the result.
 *
 * Deployments typically source these from environment or config, so a
 * malformed value must fail loudly rather than disable the guard.
 */
export function resolveLimits(overrides?: Partial<DecodeLimits>): DecodeLimits {
  const limits = { ...DEFAULT_DECODE_LIMITS, ...overrides };
  assertPositiveInteger(limits.maxPixels, 'maxPixels');
  assertPositiveInteger(limits.maxByteLength, 'maxByteLength');
  assertPositiveInteger(limits.maxDimension, 'maxDimension');
  return limits;
}

export function assertWithinByteLimit(byteLength: number, limits: DecodeLimits): void {
  if (byteLength > limits.maxByteLength) {
    throw new ImageIngestError(
      'INPUT_TOO_LARGE',
      `image is ${String(byteLength)} bytes, limit is ${String(limits.maxByteLength)}`,
    );
  }
}

/**
 * Reject implausible dimensions read from the file header, before the decoder
 * allocates the full pixel buffer.
 */
export function assertWithinPixelLimits(width: number, height: number, limits: DecodeLimits): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new ImageIngestError(
      'INVALID_IMAGE',
      `image reports invalid dimensions ${String(width)}×${String(height)}`,
    );
  }
  if (width > limits.maxDimension || height > limits.maxDimension) {
    throw new ImageIngestError(
      'IMAGE_TOO_LARGE',
      `image is ${String(width)}×${String(height)}, max dimension is ${String(limits.maxDimension)}`,
    );
  }
  if (width * height > limits.maxPixels) {
    throw new ImageIngestError(
      'IMAGE_TOO_LARGE',
      `image has ${String(width * height)} pixels, limit is ${String(limits.maxPixels)}`,
    );
  }
}
