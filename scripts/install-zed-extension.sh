#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/extension/zed-mpdg"
ZED_DATA_DIR="${ZED_USER_DATA_DIR:-$HOME/Library/Application Support/Zed}"
TARGET_DIR="$ZED_DATA_DIR/extensions/installed/mpdg"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source extension directory not found: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$ZED_DATA_DIR/extensions/installed"
rm -rf "$TARGET_DIR"
cp -R "$SOURCE_DIR" "$TARGET_DIR"

GRAMMAR_REPO_URL="file://$TARGET_DIR"

python3 - <<'PY' "$TARGET_DIR/extension.toml" "$GRAMMAR_REPO_URL"
from pathlib import Path
import sys

path = Path(sys.argv[1])
repo = sys.argv[2]
text = path.read_text()
old = 'repository = "file:///Users/michaelpeters/Dev/mpd/projects/mpd-schema/apps/schema/extension/zed-mpdg"'
if old in text:
    path.write_text(text.replace(old, f'repository = "{repo}"'))
else:
    lines = []
    replaced = False
    for line in text.splitlines():
        if line.startswith("repository = ") and not replaced:
            lines.append(f'repository = "{repo}"')
            replaced = True
        else:
            lines.append(line)
    path.write_text("\n".join(lines) + "\n")
PY

echo "Installed MPDG Zed extension to:"
echo "  $TARGET_DIR"
echo
echo "Next:"
echo "  1. Restart Zed or use zed: reload window"
echo "  2. Reopen graph.mpdg or another .mpdg file"
