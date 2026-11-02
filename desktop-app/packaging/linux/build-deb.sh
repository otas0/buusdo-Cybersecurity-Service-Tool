#!/usr/bin/env bash
# Assemble a browser-shell .deb with Depends: nodejs, xdg-utils.
# ARCH=amd64 (default) | arm64
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
ARCH="${ARCH:-amd64}"
case "$ARCH" in
  amd64|arm64) ;;
  *) echo "ARCH must be amd64 or arm64" >&2; exit 1 ;;
esac
STAGE="$ROOT/dist/linux/preventive-shield_0.2.0_${ARCH}"
DEB_OUT="$ROOT/dist/linux/preventive-shield_0.2.0_${ARCH}.deb"
CONTROL_SRC="$ROOT/packaging/linux/debian/DEBIAN/control"
if [[ "$ARCH" == "arm64" ]]; then
  CONTROL_SRC="$ROOT/packaging/linux/debian/DEBIAN/control.arm64"
fi

rm -rf "$STAGE"
mkdir -p "$STAGE/DEBIAN" \
  "$STAGE/usr/lib/preventive-shield" \
  "$STAGE/usr/share/preventive-shield/shared" \
  "$STAGE/usr/bin" \
  "$STAGE/usr/share/applications"

cp "$CONTROL_SRC" "$STAGE/DEBIAN/control"
cp "$ROOT/packaging/linux/debian/DEBIAN/postinst" "$STAGE/DEBIAN/postinst"
chmod 755 "$STAGE/DEBIAN/postinst"

rsync -a --delete \
  --exclude node_modules --exclude dist --exclude data \
  "$ROOT/" "$STAGE/usr/lib/preventive-shield/"
rsync -a --delete "$REPO/shared/" "$STAGE/usr/share/preventive-shield/shared/"

cat > "$STAGE/usr/bin/preventive-shield" <<'EOF'
#!/bin/sh
export SHIELD_SHARED_ROOT=/usr/share/preventive-shield/shared
exec node /usr/lib/preventive-shield/src/launcher.js "$@"
EOF
chmod 755 "$STAGE/usr/bin/preventive-shield"

cat > "$STAGE/usr/share/applications/preventive-shield.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Preventive Shield
Exec=preventive-shield
Terminal=false
Categories=Utility;Security;
Comment=Local shield dashboard (system browser)
EOF

# No X-GNOME-Autostart / no copy into ~/.config/autostart on install.
if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "dpkg-deb not found — staged tree at $STAGE (control arch=$ARCH)"
  exit 0
fi
dpkg-deb --build "$STAGE" "$DEB_OUT"
echo "Built $DEB_OUT"
echo "Depends include xdg-utils for the browser shell."