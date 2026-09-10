import type { DisplayProfile } from '../display-profile/types.js';
import type { SourceRect, SourceRotation } from './types.js';

/** Pixel size of a decoded (or post-rotation) source image. */
export type ImageSize = {
  readonly width: number;
  readonly height: number;
};

/**
 * UI-facing framing model for a cover-fit window over an image.
 *
 * `zoom` is relative to cover-fit: `1` fills the panel (overflow cropped),
 * values above 1 zoom in, values below 1 zoom out (letterbox via `sourceRect`
 * extending past the image). Centres are in source pixels.
 */
export type FramingState = {
  readonly centerX: number;
  readonly centerY: number;
  /** Relative to cover-fit; must be positive. */
  readonly zoom: number;
};

/** Profile fields needed to size the cover-fit window. */
export type FramingProfileSize = Pick<DisplayProfile, 'width' | 'height'>;

/**
 * How far the framing centre can still move on each axis (source pixels).
 * `0` means that arrow should be disabled.
 */
export type FramingPanRoom = {
  readonly west: number;
  readonly east: number;
  readonly north: number;
  readonly south: number;
};

const MIN_ZOOM = 0.05;

const NEXT_ROTATION: Record<SourceRotation, SourceRotation> = {
  0: 90,
  90: 180,
  180: 270,
  270: 0,
};

/** Source dimensions after clockwise rotation (framing space). */
export function rotatedImageSize(image: ImageSize, rotation: SourceRotation): ImageSize {
  if (rotation === 90 || rotation === 270) {
    return { width: image.height, height: image.width };
  }
  return image;
}

/** Advance clockwise by 90°. */
export function nextSourceRotation(rotation: SourceRotation): SourceRotation {
  return NEXT_ROTATION[rotation];
}

/**
 * Cover-fit window size in source pixels at zoom = 1: the largest region of
 * the image that matches the panel aspect ratio.
 */
export function coverWindowSize(
  image: ImageSize,
  profile: FramingProfileSize,
): { width: number; height: number } {
  const scale = Math.max(profile.width / image.width, profile.height / image.height);
  return {
    width: profile.width / scale,
    height: profile.height / scale,
  };
}

/** Centre the cover-fit window on the image (zoom = 1). */
export function defaultFraming(image: ImageSize): FramingState {
  return {
    centerX: image.width / 2,
    centerY: image.height / 2,
    zoom: 1,
  };
}

/** Convert framing state to a `sourceRect` for `normaliseToProfile`. */
export function sourceRectFromFraming(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
): SourceRect {
  const cover = coverWindowSize(image, profile);
  const zoom = Math.max(framing.zoom, MIN_ZOOM);
  const width = cover.width / zoom;
  const height = cover.height / zoom;
  return {
    x: framing.centerX - width / 2,
    y: framing.centerY - height / 2,
    width,
    height,
  };
}

/**
 * Inclusive centre range that keeps the image and window overlapping usefully:
 * when cropped (window smaller than image), the window stays inside the image;
 * when letterboxed (window larger), the full image stays inside the window.
 */
function centreBounds(imageExtent: number, windowExtent: number): { min: number; max: number } {
  const half = windowExtent / 2;
  const a = half;
  const b = imageExtent - half;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

/**
 * Keep framing so the panel never shows empty without the artwork when
 * letterboxed, and never samples outside the artwork when cropped.
 */
export function clampFraming(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
): FramingState {
  const zoom = Math.max(framing.zoom, MIN_ZOOM);
  const rect = sourceRectFromFraming(image, { ...framing, zoom }, profile);
  const x = centreBounds(image.width, rect.width);
  const y = centreBounds(image.height, rect.height);
  return {
    zoom,
    centerX: Math.min(Math.max(framing.centerX, x.min), x.max),
    centerY: Math.min(Math.max(framing.centerY, y.min), y.max),
  };
}

/**
 * Remaining pan travel on each axis after clamping. Consumers use this to
 * disable arrow controls at the edge.
 */
export function framingPanRoom(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
): FramingPanRoom {
  const clamped = clampFraming(image, framing, profile);
  const rect = sourceRectFromFraming(image, clamped, profile);
  const x = centreBounds(image.width, rect.width);
  const y = centreBounds(image.height, rect.height);
  return {
    west: clamped.centerX - x.min,
    east: x.max - clamped.centerX,
    north: clamped.centerY - y.min,
    south: y.max - clamped.centerY,
  };
}
