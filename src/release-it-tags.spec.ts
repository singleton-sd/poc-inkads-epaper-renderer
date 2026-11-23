import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function gitSetting(source: string, name: string): string {
  const match = source.match(new RegExp(`${name}:\\s*'([^']+)'`));
  assert.ok(match?.[1], `.release-it.js must set git.${name}`);
  return match[1];
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'tag-fixture',
      GIT_AUTHOR_EMAIL: 'tag-fixture@example.com',
      GIT_COMMITTER_NAME: 'tag-fixture',
      GIT_COMMITTER_EMAIL: 'tag-fixture@example.com',
    },
  }).trim();
}

describe('release-it tag selection', () => {
  it('selects the latest stable tag when HEAD is a prerelease', () => {
    const source = readFileSync(path.join(repoRoot, '.release-it.js'), 'utf8');
    const tagMatch = gitSetting(source, 'tagMatch');
    const tagExclude = gitSetting(source, 'tagExclude');

    const dir = mkdtempSync(path.join(tmpdir(), 'release-it-tags-'));
    try {
      git(dir, ['init', '--initial-branch=main']);
      git(dir, ['config', 'user.name', 'tag-fixture']);
      git(dir, ['config', 'user.email', 'tag-fixture@example.com']);
      writeFileSync(path.join(dir, 'f'), 'a\n');
      git(dir, ['add', 'f']);
      git(dir, ['commit', '-m', 'stable']);
      git(dir, ['tag', '1.4.1']);
      writeFileSync(path.join(dir, 'f'), 'b\n');
      git(dir, ['add', 'f']);
      git(dir, ['commit', '-m', 'prerelease']);
      git(dir, ['tag', '1.4.2-rc.1']);

      const withoutExclude = git(dir, ['describe', '--tags', '--abbrev=0', `--match=${tagMatch}`]);
      assert.equal(
        withoutExclude,
        '1.4.2-rc.1',
        'tagMatch alone must still see hyphenated prereleases',
      );

      const withExclude = git(dir, [
        'describe',
        '--tags',
        '--abbrev=0',
        `--match=${tagMatch}`,
        `--exclude=${tagExclude}`,
      ]);
      assert.equal(withExclude, '1.4.1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
