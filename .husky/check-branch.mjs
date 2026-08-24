import { execSync } from 'node:child_process';

const BRANCH_TYPES = 'feat|fix|docs|chore|refactor|test|ci|build|perf|style|revert';

function getCurrentBranchName() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    console.error('Error: Unable to determine the current branch.');
    process.exit(1);
  }
}

const branchName = getCurrentBranchName();

const isValidBranchName =
  branchName === 'master' ||
  branchName === 'main' ||
  branchName === 'design' ||
  branchName === 'develop' ||
  /^release\/v\d+\.\d+\.\d+$/.test(branchName) ||
  new RegExp(`^(?:${BRANCH_TYPES})\\/\\d+-[a-z0-9]+(?:-[a-z0-9]+)*$`).test(branchName);

if (!isValidBranchName) {
  console.error(
    'Error: Branch name must be one of: main, master, develop, design, ' +
      '<type>/<issue>-kebab, or release/vX.Y.Z',
  );
  process.exit(1);
}

console.log(`OK branch: ${branchName}`);
