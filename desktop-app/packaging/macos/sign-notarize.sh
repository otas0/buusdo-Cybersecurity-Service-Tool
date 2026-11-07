#!/usr/bin/env bash
# Sign with Developer ID Application and notarize via notarytool.
#
# Required env:
#   SIGN_IDENTITY   e.g. "Developer ID Application: Example Ltd (TEAMID)"
#   NOTARY_PROFILE  keychain profile from:
#                   xcrun notarytool store-credentials "PreventiveShield"
#
# Optional:
#   ENTITLEMENTS    path to entitlements plist
#   APP_ONLY=1      sign + notarize the .app only (skip productbuild .pkg)
#   --app-only      same as APP_ONLY=1 (CLI flag)
#   PKG_OUT         path for .pkg when not APP_ONLY
#
# Usage:
#   SIGN_IDENTITY="…" NOTARY_PROFILE=PreventiveShield \
#     ./packaging/macos/sign-notarize.sh dist/macos/Preventive\ Shield.app
#   APP_ONLY=1 SIGN_IDENTITY="…" NOTARY_PROFILE=PreventiveShield \
#     ./packaging/macos/sign-notarize.sh dist/macos/Preventive\ Shield.app
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_ONLY="${APP_ONLY:-0}"
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--app-only" ]]; then
    APP_ONLY=1
  else
    ARGS+=("$arg")
  fi
done
APP="${ARGS[0]:?usage: sign-notarize.sh [--app-only] path/to/App.app}"
ENTITLEMENTS="${ENTITLEMENTS:-$ROOT/packaging/macos/entitlements.plist}"
PKG_OUT="${PKG_OUT:-$ROOT/dist/macos/PreventiveShield.pkg}"

if [[ -z "${SIGN_IDENTITY:-}" ]]; then
  echo "Set SIGN_IDENTITY to your Developer ID Application certificate." >&2
  exit 1
fi
if [[ -z "${NOTARY_PROFILE:-}" ]]; then
  echo "Set NOTARY_PROFILE (notarytool keychain profile name)." >&2
  exit 1
fi

echo "Signing $APP"
codesign --force --deep --options runtime --timestamp \
  --entitlements "$ENTITLEMENTS" \
  --sign "$SIGN_IDENTITY" \
  "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

if [[ "$APP_ONLY" == "1" ]]; then
  echo "APP_ONLY=1 — zipping .app for notarytool (no productbuild)"
  ZIP_OUT="${ZIP_OUT:-$ROOT/dist/macos/buusdo-cybersecurity-service-tool-app.zip}"
  mkdir -p "$(dirname "$ZIP_OUT")"
  ditto -c -k --keepParent "$APP" "$ZIP_OUT"
  echo "Notarizing $ZIP_OUT"
  xcrun notarytool submit "$ZIP_OUT" --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$APP"
  echo "Signed + notarized .app only. Stapled: $APP"
  echo "Installers must not create LaunchAgents; open-at-login stays off until the user enables it."
  exit 0
fi

echo "Building component pkg → $PKG_OUT"
mkdir -p "$(dirname "$PKG_OUT")"
productbuild --component "$APP" /Applications --sign "${INSTALL_SIGN_IDENTITY:-$SIGN_IDENTITY}" "$PKG_OUT" || \
  productbuild --component "$APP" /Applications "$PKG_OUT"

echo "Notarizing $PKG_OUT"
xcrun notarytool submit "$PKG_OUT" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$PKG_OUT"
xcrun stapler staple "$APP" || true
echo "Signed + notarized. Stapled: $PKG_OUT"
echo "Installers must not create LaunchAgents; open-at-login stays off until the user enables it."