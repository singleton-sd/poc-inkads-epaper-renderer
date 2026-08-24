#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/add-worktree.sh --type <type> --issue <n> --slug <kebab-slug>

Creates a sibling worktree from origin/main:
  ../<type>-<issue>-<slug>
  branch: <type>/<issue>-<slug>

Example:
  ./scripts/add-worktree.sh --type chore --issue 1 --slug bootstrap-tooling
EOF
}

type=""
issue=""
slug=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type)
      type="${2:-}"
      shift 2
      ;;
    --issue)
      issue="${2:-}"
      shift 2
      ;;
    --slug)
      slug="${2:-}"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$type" || -z "$issue" || -z "$slug" ]]; then
  usage >&2
  exit 1
fi

if ! [[ "$issue" =~ ^[0-9]+$ ]]; then
  echo "--issue must be a GitHub issue number" >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
parent_dir="$(dirname "$repo_root")"
branch="${type}/${issue}-${slug}"
worktree_path="${parent_dir}/${type}-${issue}-${slug}"

git -C "$repo_root" fetch origin
git -C "$repo_root" worktree add -b "$branch" "$worktree_path" origin/main

echo "Worktree ready:"
echo "  path:   $worktree_path"
echo "  branch: $branch"
