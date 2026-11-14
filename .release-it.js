/**
 * Releases commit the version bump and CHANGELOG.md to main, push the
 * annotated `X.Y.Z` tag, publish to npm, and open a GitHub Release.
 * The CI job authenticates as the singleton-release GitHub App so the
 * push can bypass the CodeRabbit required ruleset. Never a PAT, never
 * the default GITHUB_TOKEN for that push (GH013).
 *
 * @typedef {import('release-it').Config} ReleaseItConfig
 * @type {ReleaseItConfig}
 */
export default {
  git: {
    commitMessage: 'chore(release): v${version} [skip ci]',
    tagName: '${version}',
    tagMatch: '[0-9]*.[0-9]*.[0-9]*',
    requireBranch: 'main',
    requireCleanWorkingDir: true,
    requireCommits: true,
    requireCommitsFail: false,
    commit: true,
    push: true,
    tag: true,
  },
  npm: {
    publish: true,
    skipChecks: true,
  },
  hooks: {
    'before:release': 'pnpm lint && pnpm typecheck && pnpm test',
    'after:bump': 'node ./scripts/sync-version.mjs',
  },
  github: {
    release: true,
    releaseName: 'v${version}',
    /**
     * Append the npm package URL so the GitHub Release page links to npmjs
     * (release-it only prints that URL in CI logs by default).
     * @param {{ changelog?: string, version: string, name: string }} ctx
     */
    releaseNotes({ changelog, version, name }) {
      const notes = (changelog ?? '').trim();
      const npmUrl = `https://www.npmjs.com/package/${name}/v/${version}`;
      return `${notes}\n\n📦 [\`${name}@${version}\`](${npmUrl})\n`;
    },
  },
  plugins: {
    '@release-it/conventional-changelog': {
      infile: 'CHANGELOG.md',
      preset: {
        name: 'conventionalcommits',
        compareUrlFormat:
          '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
      },
    },
  },
};
