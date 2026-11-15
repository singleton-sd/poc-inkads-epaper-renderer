#!/usr/bin/env bash
set -euo pipefail

# Stay on the revision that already passed quality checks. Fetch tags for
# git describe. If origin/main has moved, fail before pnpm release:ci so
# npm is not published from an unvalidated tree.

git fetch origin --tags
git fetch origin main

validated="$(git rev-parse HEAD)"
remote_main="$(git rev-parse origin/main)"
if [[ "${validated}" != "${remote_main}" ]]; then
  echo "Refusing to release: origin/main moved past the validated revision ${validated}." >&2
  echo "origin/main is ${remote_main}." >&2
  exit 1
fi

git checkout -B main
