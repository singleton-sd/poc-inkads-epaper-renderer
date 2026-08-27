import type { DisplayProfile } from '../display-profile/types.js';
import type { MonoBitmap, MonoRenderMode } from '../mono/types.js';

export type PackMonoBitmapOptions = {
  readonly profile: DisplayProfile;
  /** Recorded in metadata; defaults to the package's own version. */
  readonly rendererVersion?: string;
};

/** Integrity and provenance for a packed framebuffer. */
export type FramebufferMetadata = {
  readonly profileId: DisplayProfile['id'];
  readonly rendererVersion: string;
  readonly width: number;
  readonly height: number;
  readonly mode: MonoRenderMode;
  readonly bitsPerPixel: number;
  readonly pixelPacking: DisplayProfile['pixelPacking'];
  readonly orientation: DisplayProfile['orientation'];
  readonly polarity: DisplayProfile['polarity'];
  readonly byteLength: number;
  /** CRC-32 (IEEE) of `bytes`, lowercase hex. */
  readonly checksum: string;
};

/** Device-ready framebuffer plus the metadata the contract carries alongside it. */
export type PackedFramebuffer = {
  readonly bytes: Uint8Array;
  readonly metadata: FramebufferMetadata;
};

export type PackSource = Pick<MonoBitmap, 'profileId' | 'width' | 'height' | 'mode' | 'pixels'>;
