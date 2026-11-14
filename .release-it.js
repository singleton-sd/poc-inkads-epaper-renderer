/**
 * Tag-only releases (Pato, 14 Nov 2026): never commit or push to the
 * default branch. Version is computed from the latest git tag plus
 * Conventional Commits; package.json / src/version.ts are bumped in the
 * CI workspace only so npm publish sees the new version. The annotated
 * tag (existing `X.Y.Z` format) is pushed explicitly; GitHub Release
 * notes are generated here. CHANGELOG.md is historical.
 *
 * @typedef {import('release-it').Config} ReleaseItConfig
 * @type {ReleaseItConfig}
 */
export default {
  git: {
    tagName: '${version}',
    tagMatch: '[0-9]*.[0-9]*.[0-9]*',
    requireBranch: 'main',
    requireCleanWorkingDir: true,
    requireCommits: true,
    requireCommitsFail: false,
    commit: false,
    push: false,
    tag: true,
  },
  npm: {
    publish: true,
    skipChecks: true,
    ignoreVersion: true,
  },
  hooks: {
    'before:release': 'pnpm lint && pnpm typecheck && pnpm test',
    'after:bump': 'node ./scripts/sync-version.mjs',
    // after:git:release does not run when git.push is false. Push the
    // annotated tag immediately before the GitHub Release so the tag
    // exists on the remote. release-it interpolates ${version};
    // $GITHUB_ACTIONS is expanded by the shell. Hooks still run in
    // --dry-run, so only push from GitHub Actions. Pushes
    // refs/tags/<ver> only — never HEAD/main — so branch rulesets
    // (e.g. CodeRabbit required) do not apply. No PAT / ruleset bypass.
    'before:github:release':
      'if [ "$GITHUB_ACTIONS" = true ]; then git push origin "refs/tags/${version}"; else printf "%s\\n" "Skipping tag push outside GitHub Actions"; fi',
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
      infile: false,
      preset: {
        name: 'conventionalcommits',
        compareUrlFormat:
          '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
      },
    },
  },
};
