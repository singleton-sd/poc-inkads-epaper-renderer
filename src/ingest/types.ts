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

export type NormaliseToProfileOptions = {
  readonly profile: DisplayProfile;
  readonly crop?: CropPosition;
};

/** Profile-sized RGB working buffer for later dither/pack steps. */
export type ProfileRgbBuffer = {
  readonly profileId: DisplayProfile['id'];
  readonly width: number;
  readonly height: number;
  readonly rgb: Uint8Array;
};
