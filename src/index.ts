/**
 * Shared InkAds e-paper renderer.
 *
 * Framework-independent TypeScript package for converting advertiser artwork
 * into display-ready e-paper assets.
 */

export const RENDERER_PACKAGE_NAME = '@singleton-sd/inkads-epaper-renderer' as const;

export {
  WAVESHARE_7_5_BW_ID,
  assertAspectRatioMatchesDimensions,
  computePackedByteLength,
  defineDisplayProfile,
  DisplayProfileValidationError,
  getDisplayProfile,
  hasDisplayProfile,
  listDisplayProfiles,
  waveshare75BwProfile,
} from './display-profile/index.js';

export type {
  AspectRatio,
  DisplayOrientation,
  DisplayPolarity,
  DisplayProfile,
  DisplayProfileId,
  DisplayProfileInput,
  PixelPacking,
} from './display-profile/index.js';

export {
  decodeImage,
  ImageIngestError,
  ingestImageToProfile,
  normaliseToProfile,
} from './ingest/index.js';

export type {
  CropPosition,
  DecodedImage,
  NormaliseToProfileOptions,
  ProfileRgbBuffer,
} from './ingest/index.js';

export { MonoRenderError, renderMono, rgbToLuma } from './mono/index.js';

export type { MonoBitmap, MonoRenderMode, MonoSource, RenderMonoOptions } from './mono/index.js';

export type RendererStub = {
  readonly packageName: typeof RENDERER_PACKAGE_NAME;
  readonly version: string;
};

/**
 * Temporary helper retained for early consumers; prefer display profile exports.
 */
export function createRendererStub(version = '0.0.0'): RendererStub {
  return {
    packageName: RENDERER_PACKAGE_NAME,
    version,
  };
}
