/**
 * Shared InkAds e-paper renderer.
 *
 * Framework-independent TypeScript package for converting advertiser artwork
 * into display-ready e-paper assets.
 *
 * This entry point is isomorphic: it touches no Node built-ins, so the whole
 * crop → dither → pack → preview pipeline can run live in the browser while
 * the user frames their creative. File decoding and PNG encoding need platform
 * APIs and live in `@singleton-sd/inkads-epaper-renderer/node`; in the browser,
 * decode with `createImageBitmap` and hand the canvas pixels to
 * `fromRgbaImageData`.
 *
 * Imports here must stay granular rather than using module barrels, since a
 * barrel would pull the Node-only decoder back into the browser bundle.
 */

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

export { ImageIngestError } from './ingest/errors.js';
export { DEFAULT_DECODE_LIMITS } from './ingest/limits.js';
export type { DecodeLimits } from './ingest/limits.js';
export { normaliseToProfile } from './ingest/normalise.js';
export { fromRgbaImageData } from './ingest/rgba.js';
export type { FromRgbaLimits, RgbaImageData } from './ingest/rgba.js';

export type {
  CropPosition,
  DecodedImage,
  NormaliseToProfileOptions,
  ProfileRgbBuffer,
  RgbColour,
  SourceRect,
} from './ingest/types.js';

export { MonoRenderError, renderMono, rgbToLuma } from './mono/index.js';

export type { MonoBitmap, MonoRenderMode, MonoSource, RenderMonoOptions } from './mono/index.js';

export { crc32Hex, FramebufferPackError, packMonoBitmap, toPreviewImage } from './pack/index.js';

export type {
  FramebufferMetadata,
  PackedFramebuffer,
  PackErrorCode,
  PackMonoBitmapOptions,
  PackSource,
  PreviewImage,
} from './pack/index.js';

export { RENDERER_VERSION } from './version.js';
