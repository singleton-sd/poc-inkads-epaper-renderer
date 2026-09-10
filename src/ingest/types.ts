import type { DisplayProfile } from '../display-profile/types.js';

/** Decoded RGB image before profile normalisation. */
export type DecodedImage = {
  readonly width: number;
  readonly height: number;
  /** Interleaved RGB bytes, length = width * height * 3. */
  readonly rgb: Uint8Array;
};

/**
 * Crop/position for cover-style fit into the display profile.
 * Offsets are in [0, 1]: 0 = align start, 0.5 = centre, 1 = align end.
 */
export type CropPosition = {
  readonly x: number;
  readonly y: number;
};

/**
 * An explicit region of the source image, in source pixels.
 *
 * Unlike `CropPosition`, which only slides a fixed-size window, this sets the
 * window's size too, which is what zooming is. It may extend beyond the image
 * on any side: that is how you zoom out past cover-fit, and the uncovered area
 * is filled with `background` (letterboxing).
 */
export type SourceRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** Opaque RGB fill, each channel 0–255. */
export type RgbColour = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

/**
 * Clockwise rotation of the decoded source, applied before crop / sourceRect.
 * Dimensions swap for 90° and 270°.
 */
export type SourceRotation = 0 | 90 | 180 | 270;

export type NormaliseToProfileOptions = {
  readonly profile: DisplayProfile;
  /**
   * Position of the cover-fit window. Ignored when `sourceRect` or `zoom` is
   * given, and combining those inputs is an error.
   */
  readonly crop?: CropPosition;
  /** Explicit region to render, enabling zoom and letterboxing. */
  readonly sourceRect?: SourceRect;
  /**
   * Cover-fit-relative zoom (`1` = fill the panel). The renderer builds the
   * `sourceRect` and clamps pan; consumers only send zoom (+ optional centre)
   * and `rotation`. Mutually exclusive with `crop` and `sourceRect`.
   */
  readonly zoom?: number;
  /**
   * Pan centre in source pixels **after** `rotation`. Defaults to the image
   * mid-point when `zoom` is set. Ignored unless `zoom` is set.
   */
  readonly centerX?: number;
  readonly centerY?: number;
  /** Fill for areas outside the source image. Defaults to white. */
  readonly background?: RgbColour;
  /**
   * Clockwise rotation of the decoded RGB before framing. Defaults to `0`.
   * Useful when an upload is sideways relative to the panel.
   */
  readonly rotation?: SourceRotation;
};

/** Profile-sized RGB working buffer for later dither/pack steps. */
export type ProfileRgbBuffer = {
  readonly profileId: DisplayProfile['id'];
  readonly width: number;
  readonly height: number;
  readonly rgb: Uint8Array;
  /**
   * The region actually rendered, after aspect correction and defaulting.
   *
   * Lets a framing UI draw handles matching the real result, and lets a caller
   * measure how much of the upload was discarded.
   */
  readonly sourceRect: SourceRect;
};
