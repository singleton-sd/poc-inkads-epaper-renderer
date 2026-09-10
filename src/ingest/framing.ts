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
 * Keep the framing window inside the artwork when possible. If the window is
 * larger than the image (zoomed out), pin the centre to the image mid-point.
 */
export function clampFraming(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
): FramingState {
  const rect = sourceRectFromFraming(image, framing, profile);
  let centerX = framing.centerX;
  let centerY = framing.centerY;

  if (rect.width >= image.width) {
    centerX = image.width / 2;
  } else {
    const half = rect.width / 2;
    centerX = Math.min(Math.max(centerX, half), image.width - half);
  }

  if (rect.height >= image.height) {
    centerY = image.height / 2;
  } else {
    const half = rect.height / 2;
    centerY = Math.min(Math.max(centerY, half), image.height - half);
  }

  return { zoom: framing.zoom, centerX, centerY };
}
