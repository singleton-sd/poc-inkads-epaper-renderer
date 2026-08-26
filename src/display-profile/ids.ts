import type { DisplayProfileId } from './types.js';
import { DisplayProfileValidationError } from './errors.js';

const PROFILE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9.]+)*$/;

export function asDisplayProfileId(value: string): DisplayProfileId {
  const trimmed = value.trim();
  if (!PROFILE_ID_PATTERN.test(trimmed)) {
    throw new DisplayProfileValidationError(
      `display profile id must be kebab-case alphanumerics: got "${value}"`,
    );
  }
  return trimmed as DisplayProfileId;
}

/** First InkAds B/W profile — Waveshare 7.5″ 800×480 panel. */
export const WAVESHARE_7_5_BW_ID = asDisplayProfileId('waveshare-7.5-bw');
