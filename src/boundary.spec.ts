import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const distDir = path.dirname(fileURLToPath(import.meta.url));

/** Packages that bundle a codec or reach for Node built-ins. */
const SERVER_ONLY_SPECIFIERS = ['pngjs', 'jpeg-js'];

function importSpecifiersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1]!);
}

/**
 * Every module reachable from an entry point, following relative imports.
 *
 * A browser bundler resolves the same graph, so this is what decides whether a
 * Node built-in ends up in the client bundle.
 */
function collectGraph(entry: string): { files: string[]; external: Set<string> } {
  const seen = new Set<string>();
  const external = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);

    for (const specifier of importSpecifiersOf(file)) {
      if (specifier.startsWith('.')) {
        queue.push(path.resolve(path.dirname(file), specifier));
      } else {
        external.add(specifier);
      }
    }
  }

  return { files: [...seen], external };
}

describe('public entry point boundary', () => {
  it('keeps Node built-ins and codecs out of the browser-facing graph', () => {
    const { external } = collectGraph(path.join(distDir, 'index.js'));
    const offenders = [...external].filter(
      (specifier) => specifier.startsWith('node:') || SERVER_ONLY_SPECIFIERS.includes(specifier),
    );
    assert.deepEqual(
      offenders,
      [],
      `the root entry point must stay isomorphic, found: ${offenders.join(', ')}`,
    );
  });

  it('detects server-only imports when they are present', () => {
    // Guards the check above from passing vacuously: the node entry point is
    // known to pull in a codec, so the same scan must flag it.
    const { external } = collectGraph(path.join(distDir, 'node.js'));
    const offenders = [...external].filter(
      (specifier) => specifier.startsWith('node:') || SERVER_ONLY_SPECIFIERS.includes(specifier),
    );
    assert.ok(offenders.length > 0, 'expected the node entry point to import server-only modules');
  });

  it('exposes the server-only surface through the node entry point', async () => {
    const nodeEntry = (await import('./node.js')) as Record<string, unknown>;
    for (const name of ['decodeImage', 'ingestImageToProfile', 'encodePreviewPng']) {
      assert.equal(typeof nodeEntry[name], 'function', `${name} should be exported`);
    }
  });

  it('still exposes the full pipeline except decode/encode at the root', async () => {
    const root = (await import('./index.js')) as Record<string, unknown>;
    for (const name of [
      'normaliseToProfile',
      'fromRgbaImageData',
      'renderMono',
      'packMonoBitmap',
      'toPreviewImage',
      'waveshare75BwProfile',
    ]) {
      assert.ok(root[name] !== undefined, `${name} should be exported`);
    }
    assert.equal(root['decodeImage'], undefined);
    assert.equal(root['encodePreviewPng'], undefined);
  });
});
