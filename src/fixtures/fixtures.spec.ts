import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { waveshare75BwProfile } from '../display-profile/index.js';
import { renderMono } from '../mono/index.js';
import type { MonoRenderMode } from '../mono/index.js';
import { packMonoBitmap } from '../pack/index.js';
import { CREATIVE_FIXTURES } from './creatives.js';
import type { CreativeFixtureName } from './creatives.js';
import { EXPECTED_CHECKSUMS } from './expected.js';

const profile = waveshare75BwProfile;
const MODES: readonly MonoRenderMode[] = ['threshold', 'floyd-steinberg', 'atkinson'];

const fixtureNames = Object.keys(CREATIVE_FIXTURES) as CreativeFixtureName[];

function packFixture(name: CreativeFixtureName, mode: MonoRenderMode) {
  const source = CREATIVE_FIXTURES[name]();
  const bitmap = renderMono(source, { mode });
  return packMonoBitmap(bitmap, { profile });
}

describe('golden creative fixtures', () => {
  for (const name of fixtureNames) {
    describe(name, () => {
      it('generates a profile-sized RGB buffer', () => {
        const source = CREATIVE_FIXTURES[name]();
        assert.equal(source.profileId, profile.id);
        assert.equal(source.width, profile.width);
        assert.equal(source.height, profile.height);
        assert.equal(source.rgb.length, profile.width * profile.height * 3);
      });

      it('regenerates byte-identical source pixels', () => {
        assert.deepEqual(CREATIVE_FIXTURES[name]().rgb, CREATIVE_FIXTURES[name]().rgb);
      });

      for (const mode of MODES) {
        it(`packs to 48000 bytes with the expected checksum in ${mode}`, () => {
          const packed = packFixture(name, mode);
          assert.equal(packed.bytes.length, 48_000);
          assert.equal(packed.metadata.mode, mode);
          assert.equal(packed.metadata.checksum, EXPECTED_CHECKSUMS[name][mode]);
        });
      }
    });
  }

  it('covers every fixture and mode', () => {
    assert.deepEqual(Object.keys(EXPECTED_CHECKSUMS).sort(), [...fixtureNames].sort());
    for (const name of fixtureNames) {
      assert.deepEqual(Object.keys(EXPECTED_CHECKSUMS[name]).sort(), [...MODES].sort());
    }
  });

  it('distinguishes the three modes for dithered content', () => {
    const checksums = MODES.map(
      (mode) => packFixture('photograph-downscaled', mode).metadata.checksum,
    );
    assert.equal(new Set(checksums).size, MODES.length);
  });

  it('keeps checksums independent of renderer version metadata', () => {
    const source = CREATIVE_FIXTURES['logo-flat-shapes']();
    const bitmap = renderMono(source, { mode: 'threshold' });
    const packed = packMonoBitmap(bitmap, { profile });
    const bumped = packMonoBitmap(bitmap, { profile, rendererVersion: '99.99.99' });
    assert.notEqual(packed.metadata.rendererVersion, bumped.metadata.rendererVersion);
    assert.equal(packed.metadata.checksum, bumped.metadata.checksum);
  });
});
