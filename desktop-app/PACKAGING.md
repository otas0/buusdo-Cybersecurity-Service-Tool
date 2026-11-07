# Packaging & platform notes

Product core is Node (`src/server.js` / `src/launcher.js`). The shell is **system browser + tray/Quit**, not Chromium. Installers must start `launcher.js` (or the packaged equivalent) so the first open runs `startAuto` and scans.

## First open

1. Honest-limits confirm (ack → machine scan, skip → idle; reversible via “Show honest limits again”). Tray/Quit never clears that pending state.
2. Dashboard **proxy guide** (`#proxyGuide`) — how to point OS/browser HTTP traffic at `127.0.0.1:8080` (otherwise the block log stays quiet). Nested OS details open for the current platform only.
3. Footer **Export diagnostics** writes a URL-free snapshot into the user data directory (optional Copy path after export).

Ship checklist: [RELEASE.md](./RELEASE.md) · Install / first open. Smoke env (`SHIELD_HONEST_LIMITS=0`, `SHIELD_QUIT_GRACE_MS=0`): [RELEASE.md § Smoke env](./RELEASE.md#smoke-env). Settings PUT (`honestLimitsAckAt` preserved): [DESKTOP_SETTINGS_CONTRACT.md](../docs/DESKTOP_SETTINGS_CONTRACT.md).

## Shell choice (current)

| Piece | Choice |
|-------|--------|
| UI | System browser → `http://localhost:3010` |
| Process lifetime | Launcher + dashboard **Quit** / tray Quit / Ctrl+C |
| Single instance | `instance.lock` under the user data dir + port checks |
| Writable data | User data dir (see below) — never the app bundle |

Optional later: system WebView wrapper (e.g. WebviewJS). Electron remains an experiment only (`npm run electron`).

## User data directory

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Preventive Shield/` |
| Windows | `%APPDATA%\Preventive Shield\` |
| Linux | `~/.config/preventive-shield/` |

Contains `shield-backup.json`, `quarantine/`, `machine-decision.json`, `settings.json`, `instance.lock`. Override with `SHIELD_DATA_DIR` / `SHIELD_LISTS_PATH`.

## Open at login

Default **off**. `settings.json` → `openAtLogin: false`. Enabling writes:

- macOS: `~/Library/LaunchAgents/pt.preventiveshield.desktop.plist`
- Linux: `~/.config/autostart/preventive-shield.desktop`
- Windows: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` value `buusdo`

Disabling removes that entry. Installers must **not** create login items.

Release limits and ship checklist: [RELEASE.md](./RELEASE.md).

## Silent install

```bash
cd desktop-app
npm run install:silent
# or: node src/launcher.js --install
```

Creates the user data directory and `settings.json` with `openAtLogin: false`. Removes any login item path controlled by `SHIELD_AUTOSTART_PATH` / platform defaults. **Never** enables open-at-login.

## macOS — .app / .pkg + Developer ID + notarytool

```bash
cd desktop-app
npm run pack:macos   # downloads official Node tarball (NODE_EMBED_VERSION, default 22.13.0)
# .app only (no productbuild):
APP_ONLY=1 SIGN_IDENTITY="Developer ID Application: …" NOTARY_PROFILE=PreventiveShield \
  ./packaging/macos/sign-notarize.sh --app-only dist/macos/Preventive\ Shield.app
# or full .pkg:
SIGN_IDENTITY="…" NOTARY_PROFILE=PreventiveShield \
  ./packaging/macos/sign-notarize.sh dist/macos/Preventive\ Shield.app
```

`build-app.sh` embeds `https://nodejs.org/dist/v$NODE_EMBED_VERSION/node-v…-darwin-{arm64|x64}.tar.gz` into `Resources/node/` (cached under `dist/macos/node-cache/`). Escape hatch only: `EMBED_SYSTEM_NODE=1`.

Scripts: `packaging/macos/build-app.sh`, `sign-notarize.sh`, `entitlements.plist`.

1. Apple Developer Program team + Developer ID Application certificate.
2. `codesign --options runtime --timestamp` (scripted).
3. `notarytool submit … --wait` then `stapler staple`.
4. Gatekeeper: clean VM, non-admin account — first launch scans, no LaunchAgent unless the user enabled open-at-login.
5. No `com.apple.security.get-task-allow` in release entitlements.

Do not ship unsigned downloads as the production channel.

## Windows — NSIS / MSIX and WebView2

Current shell opens the **system browser**, so WebView2 is **not** required for the browser+tray path.

If a future build embeds a system WebView:

- Prerequisite: [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (bundled bootstrapper or Evergreen).
- Document in the installer welcome page: “Needs WebView2 Runtime on Windows 10; Windows 11 usually already has it.”

NSIS prototype: `packaging/windows/preventive-shield.nsi` (per-user `$LOCALAPPDATA\Preventive Shield`).

```bash
cd desktop-app
npm run pack:windows-stage   # syncs Node + desktop-app → packaging/windows/stage/
# on Windows with NSIS + a Windows node.exe in stage/:
makensis packaging\windows\preventive-shield.nsi
```

- Runs `launcher.js --install` so data lands in `%APPDATA%\Preventive Shield\`.
- Shortcuts start the launcher; **does not** write HKCU Run.
- Code-sign the installer and binaries (Authenticode) before release. Release workflow uses `WIN_CERT_PFX_BASE64` + `WIN_CERT_PFX_PASSWORD` when set; unsigned otherwise, same GitHub Release tag.

### Silent / enterprise install (`/S` + `/D=`)

NSIS accepts a silent install and an explicit destination. **`/D=` must be the last argument** and must not be quoted:

```bat
PreventiveShield-Setup-User.exe /S /D=C:\Users\Public\PreventiveShield
```

PowerShell:

```powershell
Start-Process -FilePath .\PreventiveShield-Setup-User.exe `
  -ArgumentList @("/S", "/D=C:\Users\Public\PreventiveShield") -Wait
```

After install, confirm `node.exe` sits beside `app\src\launcher.js` under the `/D=` directory. Data still lands under `%APPDATA%\Preventive Shield\` (not under `/D=`).

## Linux — deb (browser shell)

```bash
cd desktop-app
npm run pack:linux                 # amd64
ARCH=arm64 npm run pack:linux      # arm64 control + deb
```

`control` / `control.arm64` Depends: `nodejs (>= 18), xdg-utils`.

- `postinst` runs silent install (open-at-login off).
- Optional tray: `systray2` + `assets/tray-icon.png` (Linux), `tray-icon-template.png` (macOS), `tray-icon.ico` (Windows).
- Every pack path (`.app`, NSIS stage, `.deb`) must ship `assets/tray-icon.png`, `tray-icon-template.png`, and `tray-icon.ico` — asserted by `npm run smoke:desktop-pack-tray-assets`.
- WebKitGTK packages are **not** required for the browser shell.

## First-open scan — clean VM acceptance

Use a **clean virtual machine user**, not the developer home:

1. Install the package; confirm no login item exists.
2. Launch once; confirm scan status shows progress (`currentDir` while walking).
3. Decline or leave the ask unanswered — do not quarantine real files on the validation account unless the fixture is disposable.
4. Quit from the dashboard; confirm `:3010` and `:8080` are free (`lsof` / `ss`).
5. Launch a second copy; confirm it focuses/opens the existing dashboard and does not bind ports twice.

## Real-machine OS checks (Windows / Linux hosts)

Automated tests cover `planSystemTargets` with platform overrides. On real hardware:

- **Windows:** Startup folder, `HKCU\...\Run`, `schtasks` — only user-owned paths quarantine; `C:\Windows\...` stays report-only.
- **Linux:** `~/.config/autostart`, user crontab — quarantine only under the home; `/usr` and `/etc` hosts/paths report only, never move.