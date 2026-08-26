import type { AspectRatio, DisplayProfile, DisplayProfileInput } from './types.js';
import { DisplayProfileValidationError } from './errors.js';
import { asDisplayProfileId } from './ids.js';

export { DisplayProfileValidationError } from './errors.js';

export function computePackedByteLength(
  width: number,
  height: number,
  bitsPerPixel: number,
): number {
  if (!Number.isInteger(width) || width <= 0) {
    throw new DisplayProfileValidationError('width must be a positive integer');
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new DisplayProfileValidationError('height must be a positive integer');
  }
  if (!Number.isInteger(bitsPerPixel) || bitsPerPixel <= 0) {
    throw new DisplayProfileValidationError('bitsPerPixel must be a positive integer');
  }

  const totalBits = width * height * bitsPerPixel;
  return Math.ceil(totalBits / 8);
}

export function assertAspectRatioMatchesDimensions(
  width: number,
  height: number,
  aspectRatio: AspectRatio,
): void {
  if (
    !Number.isFinite(aspectRatio.width) ||
    !Number.isFinite(aspectRatio.height) ||
    aspectRatio.width <= 0 ||
    aspectRatio.height <= 0
  ) {
    throw new DisplayProfileValidationError(
      'aspectRatio width and height must be finite and strictly positive',
    );
  }

  if (aspectRatio.width * height !== aspectRatio.height * width) {
    throw new DisplayProfileValidationError(
      `aspectRatio ${aspectRatio.width}:${aspectRatio.height} does not match ${width}x${height}`,
    );
  }
}

function assertSupportedPacking(bitsPerPixel: number, pixelPacking: string): void {
  if (bitsPerPixel !== 1 || pixelPacking !== '1bpp-row-major') {
    throw new DisplayProfileValidationError(
      'only bitsPerPixel 1 with pixelPacking 1bpp-row-major is supported',
    );
  }
}

export function defineDisplayProfile(input: DisplayProfileInput): DisplayProfile {
  const id = asDisplayProfileId(input.id);
  assertAspectRatioMatchesDimensions(input.width, input.height, input.aspectRatio);
  assertSupportedPacking(input.bitsPerPixel, input.pixelPacking);

  const expectedPackedByteLength = computePackedByteLength(
    input.width,
    input.height,
    input.bitsPerPixel,
  );

  if (input.packedByteLength !== expectedPackedByteLength) {
    throw new DisplayProfileValidationError(
      `packedByteLength ${input.packedByteLength} does not match ` +
        `width*height*bitsPerPixel (${expectedPackedByteLength})`,
    );
  }

  return {
    id,
    label: input.label,
    width: input.width,
    height: input.height,
    aspectRatio: input.aspectRatio,
    bitsPerPixel: input.bitsPerPixel,
    pixelPacking: input.pixelPacking,
    packedByteLength: input.packedByteLength,
    orientation: input.orientation,
    polarity: input.polarity,
  };
}
