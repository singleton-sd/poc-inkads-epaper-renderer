const { execSync } = require('node:child_process');

const BRANCH_TYPES = 'feat|fix|docs|chore|refactor|test|ci|build|perf|style|revert';

const getGitBranch = () => {
  try {
    return execSync('git symbolic-ref --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(error);
    return '';
  }
};

const getTicketNumberFromBranch = (branchName) => {
  const match = branchName.match(new RegExp(`^(?:${BRANCH_TYPES})\\/([1-9][0-9]*)(?:-|$)`));
  return match ? `#${match[1]}` : null;
};

const getTicketNumberFromCommit = (commitMessage) => {
  const match = commitMessage.match(/:\s*(#\d+)\b/);
  return match ? match[1] : null;
};

module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'ticket-number': ({ header }) => {
          if (/^chore: Release v\d+\.\d+\.\d+$/.test(header)) {
            console.info('Skipping ticket number as this is a release commit');
            return [true];
          }

          const branchName = getGitBranch() || '';
          const ticketNumberFromBranch = getTicketNumberFromBranch(branchName);
          const ticketNumberFromCommit = getTicketNumberFromCommit(header);

          if (ticketNumberFromCommit) {
            if (ticketNumberFromBranch && ticketNumberFromCommit !== ticketNumberFromBranch) {
              return [
                false,
                `Ticket in commit (${ticketNumberFromCommit}) does not match branch (${ticketNumberFromBranch}).`,
              ];
            }
            return [true];
          }

          if (ticketNumberFromBranch) {
            return [true];
          }

          return [false, 'Commit must include #<issue> (or use branch <type>/<issue>-kebab).'];
        },
      },
    },
  ],
  rules: {
    'ticket-number': [2, 'always'],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 72],
    'subject-max-length': [2, 'always', 50],
    // Disabled: #<issue> tokens make sentence-case fail on the full subject.
    'subject-case': [0],
    'subject-full-stop': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'chore',
        'refactor',
        'test',
        'ci',
        'build',
        'perf',
        'style',
        'revert',
      ],
    ],
  },
};
