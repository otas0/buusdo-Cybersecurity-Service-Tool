#!/usr/bin/env bash
# Sync local Node + desktop-app into packaging/windows/stage/ for NSIS.
# On Windows builders, stage/node.exe is required before makensis.
#
#   ./packaging/windows/stage-nsis.sh
#   NODE_BIN=/path/to/node.exe ./packaging/windows/stage-nsis.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
STAGE="$ROOT/packaging/windows/stage"
NODE_BIN="${NODE_BIN:-$(command -v node)}"

rm -rf "$STAGE"
mkdir -p "$STAGE/app" "$STAGE"

if [[ -z "$NODE_BIN" || ! -e "$NODE_BIN" ]]; then
  echo "NODE_BIN not found" >&2
  exit 1
fi

# Prefer an explicit .exe (Git Bash on Windows often returns …/node.exe).
NODE_SRC="$NODE_BIN"
if [[ -f "${NODE_BIN}.exe" ]]; then
  NODE_SRC="${NODE_BIN}.exe"
fi

case "$NODE_SRC" in
  *.exe|*.EXE)
    cp "$NODE_SRC" "$STAGE/node.exe"
    ;;
  *)
    if [[ "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* || "$(uname -o 2>/dev/null)" == Msys ]]; then
      echo "On Windows, NODE_BIN must resolve to node.exe (got: $NODE_SRC)" >&2
      exit 1
    fi
    # Non-Windows: stage sources only; builders must replace with Windows node.exe.
    cp "$NODE_SRC" "$STAGE/node"
    printf '%s\n' "Replace stage/node with a Windows node.exe before makensis." > "$STAGE/NODE_README.txt"
    ;;
esac

# Prefer rsync; fall back to tar/cp on Windows runners without rsync (exit 127).
stage_tree() {
  local src="$1" dest="$2"
  shift 2
  local excludes=("$@")
  if command -v rsync >/dev/null 2>&1; then
    local args=(-a --delete)
    local ex
    for ex in "${excludes[@]}"; do
      args+=(--exclude "$ex")
    done
    rsync "${args[@]}" "$src" "$dest"
    return
  fi
  mkdir -p "$dest"
  # Portable copy without rsync: tar stream with excludes.
  (
    cd "$src" || exit 1
    local tar_ex=()
    for ex in "${excludes[@]}"; do
      tar_ex+=(--exclude="$ex")
    done
    tar "${tar_ex[@]}" -cf - .
  ) | (cd "$dest" && tar -xf -)
}

stage_tree "$ROOT/" "$STAGE/app/" \
  node_modules dist data packaging/windows/stage '*.log'
mkdir -p "$STAGE/shared"
stage_tree "$REPO/shared/" "$STAGE/shared/"

cat > "$STAGE/run.cmd" <<'EOF'
@echo off
set SHIELD_SHARED_ROOT=%~dp0shared
"%~dp0node.exe" "%~dp0app\src\launcher.js" %*
EOF

cat > "$STAGE/install-silent.cmd" <<'EOF'
@echo off
set SHIELD_SHARED_ROOT=%~dp0shared
"%~dp0node.exe" "%~dp0app\src\launcher.js" --install
EOF

echo "Staged $STAGE"
if [[ -f "$STAGE/node.exe" ]]; then
  echo "node.exe ready for makensis"
else
  echo "WARNING: stage/node.exe missing — makensis will fail until a Windows node.exe is staged"
fi
echo "Next (Windows): makensis packaging\\windows\\preventive-shield.nsi"