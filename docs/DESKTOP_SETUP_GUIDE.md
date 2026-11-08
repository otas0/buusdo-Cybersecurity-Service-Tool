# Desktop setup guide (GitHub Release — unsigned)

**buusdo Cybersecurity Service Tool** ships the desktop app from [GitHub Releases](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/releases) (tag in [`shared/desktop-downloads.json`](../shared/desktop-downloads.json) → `releaseTag`).

**Notarization / Developer ID / Authenticode are not part of this ship path.** Builds are **unsigned**. That is intentional for the current public channel — not a temporary “until promote” step. Settings on the website says the same.

Website downloads: Settings → **Desktop app downloads** → platform link.  
Operator packaging notes: [`desktop-app/PACKAGING.md`](../desktop-app/PACKAGING.md).

## macOS (`.app` zip)

1. Download `buusdo-cybersecurity-service-tool-macos-app.zip` from the Release (or Settings → macOS app). A current good build is about **~58 MB** (production `node_modules` including `express` are inside the `.app`). If the zip is only ~50 MB, it is an old broken pack — re-download from the same Release tag after `desktop-release` republished.
2. Unzip. You get **buusdo Cybersecurity Service Tool** / legacy on-disk name `Preventive Shield.app`.
3. First open may be blocked by Gatekeeper (**“cannot be opened because the developer cannot be verified”** / **“Apple cannot check it for malicious software”**). That is expected for an unsigned zip — not a corrupt download.
4. Clear quarantine (Terminal), then open once from Finder (or right-click → **Open** the first time):

```bash
xattr -dr com.apple.quarantine "/path/to/Preventive Shield.app"
# or the renamed .app if you renamed it
open "/path/to/Preventive Shield.app"
```

Or: **System Settings → Privacy & Security** → scroll to the blocked-app message → **Open Anyway** / allow after the first attempt, then open again from Finder.

5. After a successful open the dashboard listens on **http://localhost:3010** (tray may show the legacy “Preventive Shield” name). If the app quits immediately with `Cannot find module 'express'`, you still have the pre-deps zip — replace it with the ~58 MB asset.
6. Open-at-login stays **off** until you enable it in the app.
7. Honest limits (no TLS decrypt, no process kill, system dirs report-only): website Privacy → Desktop honest limits.

## Windows (NSIS)

1. Download `buusdo-cybersecurity-service-tool-Setup-User.exe` from the Release.
2. SmartScreen may warn (**Unknown publisher**) — expected for an unsigned installer. Choose **More info → Run anyway** only if you trust this GitHub Release.
3. Per-user install under `%LOCALAPPDATA%` / `%APPDATA%\Preventive Shield\` (legacy path name).
4. Open-at-login stays off until you enable it.

## Linux (amd64 `.deb`)

1. Download `buusdo-cybersecurity-service-tool_*_amd64.deb` from the Release.
2. Install with your package tool, e.g. `sudo dpkg -i …deb` then fix deps if needed (`sudo apt-get install -f`).
3. Unsigned package is normal for this channel; verify the file came from this repo’s Releases page.

## Verify you have the right build

- Prefer links from website Settings (same URLs as `shared/desktop-downloads.json`).
- Match the Release tag shown under Settings (`Release desktop-v…`).
- Do **not** expect a notarized `*-macos-app-notarized.zip` as the primary download — that asset is unused for this ship path.

## Português (Portugal) — resumo

Builds **não assinadas** (sem notarização Apple / sem Authenticode). Descarregue só a partir deste Release / Definições do site.

- **macOS:** o zip bom tem ~58 MB. Descompacte → na primeira abertura use botão direito → **Abrir**, ou `xattr -dr com.apple.quarantine` no `.app`, ou autorize em Privacidade e segurança → Abrir mesmo assim.
- **Windows:** SmartScreen → **Mais informações** → **Executar mesmo assim** (só se confiar neste Release).
- **Linux:** instale o `.deb` da tag do Release; pacote não assinado é esperado.

Abrir ao iniciar sessão fica desligado até o ativar. Limites honestos: Privacy no site.

## Slack / ops

Slack webhook is **not** configured for this product ops path (skipped). Health failures still go through GitHub Actions email / watch notifications — see [`HEALTH_ALERTS.md`](HEALTH_ALERTS.md).
