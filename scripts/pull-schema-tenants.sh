#!/usr/bin/env bash

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_CONFIG_PATH="$SCRIPT_DIR/../config/schema-tenants.paths"
CONFIG_PATH="${SCHEMA_TENANTS_FILE:-$DEFAULT_CONFIG_PATH}"

DRY_RUN=0
ALLOW_DIRTY=0
PULL_MODE="--ff-only"

print_usage() {
  cat <<'EOF'
Usage: pull-schema-tenants.sh [options]

Pull the latest changes for each schema repo listed in a config file.

Options:
  -c, --config <path>   Use a custom config file path.
  -n, --dry-run         Show what would run without executing git pull.
      --allow-dirty     Try pulling even when the repo has local changes.
      --rebase          Use git pull --rebase instead of --ff-only.
  -h, --help            Show this help.

Config format:
  - One repo path per line.
  - Blank lines and lines starting with # are ignored.

Default config path:
  apps/schema/config/schema-tenants.paths
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--config)
      shift
      if [[ $# -eq 0 ]]; then
        echo "Missing value for --config"
        exit 1
      fi
      CONFIG_PATH="$1"
      ;;
    -n|--dry-run)
      DRY_RUN=1
      ;;
    --allow-dirty)
      ALLOW_DIRTY=1
      ;;
    --rebase)
      PULL_MODE="--rebase"
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      print_usage
      exit 1
      ;;
  esac
  shift
done

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Config file not found: $CONFIG_PATH"
  echo "Create it with one repo path per line."
  exit 1
fi

mapfile -t RAW_PATHS < <(sed -e 's/[[:space:]]*$//' -e '/^[[:space:]]*#/d' -e '/^[[:space:]]*$/d' "$CONFIG_PATH")

if [[ ${#RAW_PATHS[@]} -eq 0 ]]; then
  echo "No repo paths found in: $CONFIG_PATH"
  exit 1
fi

expand_path() {
  local input="$1"
  if [[ "$input" == "~/"* ]]; then
    printf '%s\n' "$HOME/${input#~/}"
    return
  fi
  printf '%s\n' "$input"
}

shorten_one_line() {
  local text="$1"
  text="$(printf '%s' "$text" | tr '\n' ' ' | tr -s ' ')"
  printf '%s\n' "$text" | sed -E 's/^ +//; s/ +$//'
}

PULLED=()
UP_TO_DATE=()
DRY_RUN_ONLY=()
SKIPPED_DIRTY=()
FAILED=()
MISSING=()
NOT_GIT=()

TOTAL="${#RAW_PATHS[@]}"
INDEX=0

echo "Schema tenant sync"
echo "Config: $CONFIG_PATH"
echo "Mode: git pull $PULL_MODE"
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run: yes"
fi
echo

for RAW_PATH in "${RAW_PATHS[@]}"; do
  INDEX=$((INDEX + 1))
  PATH_TO_REPO="$(expand_path "$RAW_PATH")"

  echo "[$INDEX/$TOTAL] $PATH_TO_REPO"

  if [[ ! -d "$PATH_TO_REPO" ]]; then
    echo "  -> missing path"
    MISSING+=("$PATH_TO_REPO")
    continue
  fi

  if ! git -C "$PATH_TO_REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "  -> not a git repo"
    NOT_GIT+=("$PATH_TO_REPO")
    continue
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    DIRTY_OUTPUT="$(git -C "$PATH_TO_REPO" status --porcelain 2>/dev/null || true)"
    if [[ -n "$DIRTY_OUTPUT" && "$ALLOW_DIRTY" -eq 0 ]]; then
      echo "  -> dry-run: would skip (dirty working tree)"
      DRY_RUN_ONLY+=("$PATH_TO_REPO | would skip dirty")
    else
      echo "  -> dry-run: would run git -C \"$PATH_TO_REPO\" pull $PULL_MODE"
      DRY_RUN_ONLY+=("$PATH_TO_REPO | would pull")
    fi
    continue
  fi

  if [[ "$ALLOW_DIRTY" -eq 0 ]]; then
    DIRTY_OUTPUT="$(git -C "$PATH_TO_REPO" status --porcelain 2>/dev/null || true)"
    if [[ -n "$DIRTY_OUTPUT" ]]; then
      echo "  -> skipped (dirty working tree)"
      SKIPPED_DIRTY+=("$PATH_TO_REPO")
      continue
    fi
  fi

  PULL_OUTPUT="$(git -C "$PATH_TO_REPO" pull "$PULL_MODE" 2>&1)"
  PULL_EXIT_CODE=$?

  if [[ "$PULL_EXIT_CODE" -eq 0 ]]; then
    if echo "$PULL_OUTPUT" | grep -Eq "Already up[ -]to[ -]date"; then
      echo "  -> already up to date"
      UP_TO_DATE+=("$PATH_TO_REPO")
    else
      echo "  -> pulled"
      PULLED+=("$PATH_TO_REPO")
    fi
    continue
  fi

  SHORT_OUTPUT="$(shorten_one_line "$PULL_OUTPUT")"

  if echo "$PULL_OUTPUT" | grep -qiE "Please commit your changes or stash them|would be overwritten by merge"; then
    FAILED+=("$PATH_TO_REPO | local changes would be overwritten")
    echo "  -> failed (local changes would be overwritten)"
  elif echo "$PULL_OUTPUT" | grep -qiE "Not possible to fast-forward|divergent branches"; then
    FAILED+=("$PATH_TO_REPO | not fast-forward; manual sync needed")
    echo "  -> failed (not fast-forward)"
  else
    FAILED+=("$PATH_TO_REPO | $SHORT_OUTPUT")
    echo "  -> failed"
  fi
done

echo
echo "Summary"
echo "  total: ${TOTAL}"
echo "  pulled: ${#PULLED[@]}"
echo "  already up to date: ${#UP_TO_DATE[@]}"
echo "  dry run only: ${#DRY_RUN_ONLY[@]}"
echo "  skipped dirty: ${#SKIPPED_DIRTY[@]}"
echo "  missing paths: ${#MISSING[@]}"
echo "  not git repos: ${#NOT_GIT[@]}"
echo "  failed pulls: ${#FAILED[@]}"

if [[ ${#SKIPPED_DIRTY[@]} -gt 0 ]]; then
  echo
  echo "Skipped (dirty working tree):"
  for ITEM in "${SKIPPED_DIRTY[@]}"; do
    echo "  - $ITEM"
  done
fi

if [[ ${#DRY_RUN_ONLY[@]} -gt 0 ]]; then
  echo
  echo "Dry-run actions:"
  for ITEM in "${DRY_RUN_ONLY[@]}"; do
    echo "  - $ITEM"
  done
fi

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo
  echo "Missing paths:"
  for ITEM in "${MISSING[@]}"; do
    echo "  - $ITEM"
  done
fi

if [[ ${#NOT_GIT[@]} -gt 0 ]]; then
  echo
  echo "Not a git repo:"
  for ITEM in "${NOT_GIT[@]}"; do
    echo "  - $ITEM"
  done
fi

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo
  echo "Failed pulls:"
  for ITEM in "${FAILED[@]}"; do
    echo "  - $ITEM"
  done
fi

if [[ ${#FAILED[@]} -gt 0 || ${#MISSING[@]} -gt 0 || ${#NOT_GIT[@]} -gt 0 || ${#SKIPPED_DIRTY[@]} -gt 0 ]]; then
  exit 1
fi

exit 0
