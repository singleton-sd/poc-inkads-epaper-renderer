/**
 * Stable identifier for a display profile in the cloud ↔ firmware contract.
 *
 * Format: `<vendor>-<size>-<variant>` in kebab-case, e.g. `waveshare-7.5-bw`.
 * New hardware adds a new id; existing ids stay stable for stored assets.
 */
export type DisplayProfileId = string & { readonly __brand: 'DisplayProfileId' };

/** How monochrome or palette pixels are packed for the device driver. */
export type PixelPacking = '1bpp-row-major';

/**
 * Screen rotation applied during packing relative to the uploaded artwork.
 * Placeholders until hardware validation (issue #8); default is native.
 */
export type DisplayOrientation = 'native' | 'rotate-90' | 'rotate-180' | 'rotate-270';

/** Black/white polarity for 1 bpp panels. Placeholder until hardware validation. */
export type DisplayPolarity = 'normal' | 'inverted';

export type AspectRatio = {
  readonly width: number;
  readonly height: number;
};

export type DisplayProfile = {
  readonly id: DisplayProfileId;
  /** Human-readable label for UI and logs. */
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: AspectRatio;
  readonly bitsPerPixel: number;
  readonly pixelPacking: PixelPacking;
  /** Expected packed framebuffer size for this profile. */
  readonly packedByteLength: number;
  readonly orientation: DisplayOrientation;
  readonly polarity: DisplayPolarity;
};

export type DisplayProfileInput = Omit<DisplayProfile, 'id'> & {
  readonly id: string;
};
