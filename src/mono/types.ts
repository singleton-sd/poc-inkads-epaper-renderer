import type { DisplayProfile } from '../display-profile/types.js';
import type { ProfileRgbBuffer } from '../ingest/types.js';

/** Selectable 1-bit render modes (colour dithering is out of scope). */
export type MonoRenderMode = 'threshold' | 'floyd-steinberg' | 'atkinson';

export type RenderMonoOptions = {
  readonly mode: MonoRenderMode;
  /**
   * Luminance cut-off for `threshold` mode (0–255 inclusive).
   * Default 128. Ignored by error-diffusion modes.
   */
  readonly threshold?: number;
};

/**
 * Profile-sized monochrome bitmap before packing.
 * Each pixel is `0` (black) or `1` (white). Length = width * height.
 */
export type MonoBitmap = {
  readonly profileId: DisplayProfile['id'];
  readonly width: number;
  readonly height: number;
  readonly mode: MonoRenderMode;
  readonly pixels: Uint8Array;
};

export type MonoSource = Pick<ProfileRgbBuffer, 'profileId' | 'width' | 'height' | 'rgb'>;
