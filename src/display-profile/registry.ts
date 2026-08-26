import { asDisplayProfileId } from './ids.js';
import { waveshare75BwProfile } from './profiles/waveshare-7-5-bw.js';
import type { DisplayProfile, DisplayProfileId } from './types.js';
import { DisplayProfileValidationError } from './errors.js';

const profilesById = new Map<DisplayProfileId, DisplayProfile>([
  [waveshare75BwProfile.id, waveshare75BwProfile],
]);

export function listDisplayProfiles(): readonly DisplayProfile[] {
  return [...profilesById.values()];
}

export function getDisplayProfile(id: DisplayProfileId | string): DisplayProfile {
  const profileId = typeof id === 'string' ? asDisplayProfileId(id) : id;
  const profile = profilesById.get(profileId);
  if (!profile) {
    throw new DisplayProfileValidationError(`unknown display profile: ${profileId}`);
  }
  return profile;
}

export function hasDisplayProfile(id: DisplayProfileId | string): boolean {
  try {
    const profileId = typeof id === 'string' ? asDisplayProfileId(id) : id;
    return profilesById.has(profileId);
  } catch {
    return false;
  }
}
