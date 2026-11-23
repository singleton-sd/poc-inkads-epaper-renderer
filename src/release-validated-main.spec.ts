import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(repoRoot, 'scripts/release-sync-validated-main.sh');
const workflow = path.join(repoRoot, '.github/workflows/release.yml');

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'release-fixture',
      GIT_AUTHOR_EMAIL: 'release-fixture@example.com',
      GIT_COMMITTER_NAME: 'release-fixture',
      GIT_COMMITTER_EMAIL: 'release-fixture@example.com',
    },
  }).trim();
}

function commitFile(cwd: string, name: string, contents: string, message: string): string {
  writeFileSync(path.join(cwd, name), contents);
  git(cwd, ['add', name]);
  git(cwd, ['commit', '-m', message]);
  return git(cwd, ['rev-parse', 'HEAD']);
}

describe('release validated main', () => {
  it('does not reset the release job onto a newer origin/main', () => {
    const source = readFileSync(workflow, 'utf8');
    assert.match(source, /scripts\/release-sync-validated-main\.sh/);
    assert.doesNotMatch(source, /git checkout -B main origin\/main/);
  });

  it('refuses when origin/main advances after validation', () => {
    const origin = mkdtempSync(path.join(tmpdir(), 'release-origin-'));
    const work = mkdtempSync(path.join(tmpdir(), 'release-work-'));
    try {
      git(origin, ['init', '--initial-branch=main']);
      git(origin, ['config', 'user.name', 'release-fixture']);
      git(origin, ['config', 'user.email', 'release-fixture@example.com']);
      const validated = commitFile(origin, 'f', 'a\n', 'validated');
      git(work, ['clone', origin, '.']);
      git(work, ['config', 'user.name', 'release-fixture']);
      git(work, ['config', 'user.email', 'release-fixture@example.com']);
      assert.equal(git(work, ['rev-parse', 'HEAD']), validated);

      const later = commitFile(origin, 'f', 'b\n', 'unvalidated');
      assert.notEqual(later, validated);
      assert.equal(git(work, ['rev-parse', 'origin/main']), validated);

      const result = spawnSync('bash', [script], {
        cwd: work,
        encoding: 'utf8',
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'release-fixture',
          GIT_AUTHOR_EMAIL: 'release-fixture@example.com',
          GIT_COMMITTER_NAME: 'release-fixture',
          GIT_COMMITTER_EMAIL: 'release-fixture@example.com',
        },
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /origin\/main moved past the validated revision/);
      assert.equal(git(work, ['rev-parse', 'HEAD']), validated);
    } finally {
      rmSync(origin, { recursive: true, force: true });
      rmSync(work, { recursive: true, force: true });
    }
  });

  it('keeps HEAD on the validated revision when origin/main has not moved', () => {
    const origin = mkdtempSync(path.join(tmpdir(), 'release-origin-ok-'));
    const work = mkdtempSync(path.join(tmpdir(), 'release-work-ok-'));
    try {
      git(origin, ['init', '--initial-branch=main']);
      git(origin, ['config', 'user.name', 'release-fixture']);
      git(origin, ['config', 'user.email', 'release-fixture@example.com']);
      const validated = commitFile(origin, 'f', 'a\n', 'validated');
      git(work, ['clone', origin, '.']);
      git(work, ['checkout', '--detach', 'HEAD']);

      const result = spawnSync('bash', [script], {
        cwd: work,
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(git(work, ['rev-parse', 'HEAD']), validated);
      assert.equal(git(work, ['branch', '--show-current']), 'main');
    } finally {
      rmSync(origin, { recursive: true, force: true });
      rmSync(work, { recursive: true, force: true });
    }
  });
});
