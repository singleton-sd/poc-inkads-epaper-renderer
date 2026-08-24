import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RENDERER_PACKAGE_NAME, createRendererStub } from './index.js';

describe('createRendererStub', () => {
  it('returns the package identity', () => {
    const stub = createRendererStub('0.0.0');
    assert.equal(stub.packageName, RENDERER_PACKAGE_NAME);
    assert.equal(stub.version, '0.0.0');
  });
});
