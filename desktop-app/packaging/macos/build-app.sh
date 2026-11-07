#!/usr/bin/env bash
# Build a .app that embeds an official Node tarball (no Chromium, no system node at runtime).
#
#   ./packaging/macos/build-app.sh
#   NODE_EMBED_VERSION=22.13.0 APP_OUT=/tmp/PreventiveShield.app ./packaging/macos/build-app.sh
#
# Optional escape hatch (not for release): EMBED_SYSTEM_NODE=1 uses NODE_BIN instead of the tarball.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
APP_NAME="Preventive Shield"  # legacy .app basename / executable (do not rename without migrate)
DISPLAY_NAME="buusdo Cybersecurity Service Tool"
APP_OUT="${APP_OUT:-$ROOT/dist/macos/${APP_NAME}.app}"
NODE_EMBED_VERSION="${NODE_EMBED_VERSION:-22.13.0}"
CONTENTS="$APP_OUT/Contents"
MACOS="$CONTENTS/MacOS"
RES="$CONTENTS/Resources"
NODE_RES="$RES/node"
CACHE="${NODE_EMBED_CACHE:-$ROOT/dist/macos/node-cache}"

uname_m="$(uname -m)"
case "$uname_m" in
  arm64|aarch64) NODE_ARCH="arm64" ;;
  x86_64) NODE_ARCH="x64" ;;
  *) echo "Unsupported macOS arch: $uname_m" >&2; exit 1 ;;
esac

TARBALL="node-v${NODE_EMBED_VERSION}-darwin-${NODE_ARCH}.tar.gz"
URL="https://nodejs.org/dist/v${NODE_EMBED_VERSION}/${TARBALL}"

rm -rf "$APP_OUT"
mkdir -p "$MACOS" "$RES/app" "$RES/shared" "$NODE_RES" "$CACHE"

rsync -a --delete \
  --exclude node_modules --exclude dist --exclude data --exclude '*.log' \
  "$ROOT/" "$RES/app/"
rsync -a --delete "$REPO/shared/" "$RES/shared/"
# Production deps must ship inside the .app (rsync excludes host node_modules).
(
  cd "$RES/app"
  npm ci --omit=dev --no-fund --no-audit
)
if [[ ! -d "$RES/app/node_modules/express" ]]; then
  echo "pack:macos missing express after npm ci — refuse empty runtime" >&2
  exit 1
fi

if [[ "${EMBED_SYSTEM_NODE:-0}" == "1" ]]; then
  NODE_BIN="${NODE_BIN:-$(command -v node)}"
  if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
    echo "EMBED_SYSTEM_NODE=1 but NODE_BIN not found" >&2
    exit 1
  fi
  mkdir -p "$NODE_RES/bin"
  cp "$NODE_BIN" "$NODE_RES/bin/node"
  chmod +x "$NODE_RES/bin/node"
  echo "Embedded system Node (escape hatch): $NODE_BIN" > "$NODE_RES/README.txt"
else
  ARCHIVE="$CACHE/$TARBALL"
  if [[ ! -f "$ARCHIVE" ]]; then
    echo "Downloading $URL"
    curl -fsSL "$URL" -o "$ARCHIVE"
  fi
  EXTRACT="$CACHE/extract-v${NODE_EMBED_VERSION}-darwin-${NODE_ARCH}"
  rm -rf "$EXTRACT"
  mkdir -p "$EXTRACT"
  tar -xzf "$ARCHIVE" -C "$EXTRACT"
  EXTRACTED="$EXTRACT/node-v${NODE_EMBED_VERSION}-darwin-${NODE_ARCH}"
  if [[ ! -x "$EXTRACTED/bin/node" ]]; then
    echo "Official Node tarball missing bin/node" >&2
    exit 1
  fi
  rsync -a --delete "$EXTRACTED/" "$NODE_RES/"
  cat > "$NODE_RES/README.txt" <<EOF
Official Node.js runtime embedded for buusdo Cybersecurity Service Tool.
  version: v${NODE_EMBED_VERSION}
  arch: darwin-${NODE_ARCH}
  source: ${URL}
This app does not require a system Node install.
EOF
fi

cat > "$MACOS/Preventive Shield" <<'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"
export SHIELD_SHARED_ROOT="$DIR/shared"
exec "$DIR/node/bin/node" "$DIR/app/src/launcher.js" "$@"
EOF
chmod +x "$MACOS/Preventive Shield"

cat > "$MACOS/Preventive Shield Install" <<'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"
export SHIELD_SHARED_ROOT="$DIR/shared"
exec "$DIR/node/bin/node" "$DIR/app/src/launcher.js" --install
EOF
chmod +x "$MACOS/Preventive Shield Install"

cat > "$CONTENTS/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${DISPLAY_NAME}</string>
  <key>CFBundleDisplayName</key><string>${DISPLAY_NAME}</string>
  <key>CFBundleIdentifier</key><string>pt.preventiveshield.desktop</string>
  <key>CFBundleVersion</key><string>0.2.0</string>
  <key>CFBundleShortVersionString</key><string>0.2.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>Preventive Shield</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

echo "Built $APP_OUT"
if [[ "${EMBED_SYSTEM_NODE:-0}" == "1" ]]; then
  echo "Embedded runtime: system Node (EMBED_SYSTEM_NODE=1)"
else
  echo "Embedded runtime: official tarball v${NODE_EMBED_VERSION} darwin-${NODE_ARCH}"
fi
"$NODE_RES/bin/node" -v
echo "Next: APP_ONLY=1 ./packaging/macos/sign-notarize.sh \"$APP_OUT\""