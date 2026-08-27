#!/usr/bin/env node
// Mirrors package.json version into src/version.ts so packed framebuffer
// metadata reports the released version. Run by release-it after:bump.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repoRoot, 'package.json');
const versionPath = path.join(repoRoot, 'src', 'version.ts');

const { version } = JSON.parse(await readFile(manifestPath, 'utf8'));
if (typeof version !== 'string' || version.length === 0) {
  throw new Error('package.json has no version to sync');
}

const source = await readFile(versionPath, 'utf8');
const updated = source.replace(
  /export const RENDERER_VERSION = '[^']*';/,
  `export const RENDERER_VERSION = '${version}';`,
);
if (updated === source) {
  throw new Error(`Could not update RENDERER_VERSION in ${versionPath}`);
}

await writeFile(versionPath, updated);
console.log(`Synced RENDERER_VERSION to ${version}`);
