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



## 简体中文 — 完整步骤

**buusdo Cybersecurity Service Tool** 桌面版来自 [GitHub Releases](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/releases)（见网站设置 → 桌面应用下载）。构建**未签名**（无 Apple 公证 / 无 Authenticode）。

### macOS（`.app` zip）

1. 从 Release 或网站设置下载 `buusdo-cybersecurity-service-tool-macos-app.zip`（约 ~58 MB）。
2. 解压得到 **buusdo Cybersecurity Service Tool**（磁盘上可能仍为 `Preventive Shield.app`）。
3. 首次打开可能被 Gatekeeper 拦截 — 对未签名包属预期。
4. 清除隔离属性后打开，或在「隐私与安全性」中选择仍要打开：

```bash
xattr -dr com.apple.quarantine "/path/to/Preventive Shield.app"
open "/path/to/Preventive Shield.app"
```

5. 成功后仪表板在 **http://localhost:3010**。登录时打开默认关闭，直至您启用。
6. 诚实限制：网站隐私 → Desktop honest limits。

### Windows（NSIS）

1. 下载 `buusdo-cybersecurity-service-tool-Setup-User.exe`。
2. SmartScreen 可能提示未知发布者 — 仅在信任本仓库 Release 时选择「详细信息 → 仍要运行」。
3. 按用户安装；登录时打开默认关闭。

### Linux（amd64 `.deb`）

1. 下载 `buusdo-cybersecurity-service-tool_*_amd64.deb`。
2. `sudo dpkg -i …deb`，必要时 `sudo apt-get install -f`。
3. 未签名属本渠道常态；确认文件来自本仓库 Releases。

## 日本語 — 手順

**buusdo Cybersecurity Service Tool** のデスクトップ版は [GitHub Releases](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/releases) から（サイトの設定 → デスクトップ版のダウンロード）。ビルドは**未署名**です。

### macOS

1. `buusdo-cybersecurity-service-tool-macos-app.zip` をダウンロード（約 ~58 MB）。
2. 展開 → **buusdo Cybersecurity Service Tool**（ディスク上は `Preventive Shield.app` の場合あり）。
3. Gatekeeper の警告は未署名では想定内。右クリック → 開く、または:

```bash
xattr -dr com.apple.quarantine "/path/to/Preventive Shield.app"
open "/path/to/Preventive Shield.app"
```

4. ダッシュボードは **http://localhost:3010**。ログイン時起動はオフのままです。

### Windows / Linux

- Windows: NSIS インストーラ。SmartScreen は「詳細情報 → それでも実行」。
- Linux: `.deb` を `dpkg -i`。未署名は通常です。

## Deutsch — Schritte

**buusdo Cybersecurity Service Tool** Desktop kommt von [GitHub Releases](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/releases) (Website → Einstellungen → Desktop-Downloads). Builds sind **unsigniert**.

### macOS

1. `buusdo-cybersecurity-service-tool-macos-app.zip` laden (~58 MB).
2. Entpacken → **buusdo Cybersecurity Service Tool** (on-disk ggf. `Preventive Shield.app`).
3. Gatekeeper-Warnung ist für unsignierte Zips erwartet. Rechtsklick → Öffnen, oder:

```bash
xattr -dr com.apple.quarantine "/path/to/Preventive Shield.app"
open "/path/to/Preventive Shield.app"
```

4. Dashboard: **http://localhost:3010**. Start bei Anmeldung bleibt aus.

### Windows / Linux

- Windows: NSIS; SmartScreen → Weitere Informationen → Trotzdem ausführen.
- Linux: `.deb` mit `dpkg -i`. Unsigniert ist für diesen Kanal normal.

## Français — étapes

**buusdo Cybersecurity Service Tool** bureau vient des [GitHub Releases](https://github.com/otas0/buusdo-Cybersecurity-Service-Tool/releases) (site → Paramètres → Téléchargements bureau). Builds **non signées**.

### macOS

1. Télécharger `buusdo-cybersecurity-service-tool-macos-app.zip` (~58 MB).
2. Décompresser → **buusdo Cybersecurity Service Tool** (sur disque parfois `Preventive Shield.app`).
3. L’avertissement Gatekeeper est attendu. Clic droit → Ouvrir, ou :

```bash
xattr -dr com.apple.quarantine "/path/to/Preventive Shield.app"
open "/path/to/Preventive Shield.app"
```

4. Tableau de bord : **http://localhost:3010**. Ouverture à la connexion reste désactivée.

### Windows / Linux

- Windows : NSIS ; SmartScreen → Informations → Exécuter quand même.
- Linux : `.deb` via `dpkg -i`. Non signé = normal pour ce canal.


## Supported languages (website + in-app setup path)

Setup and desktop download copy ship in **every** UI locale below. Open **Downloads** (`/{locale}/downloads`) — desktop app + browser extension installs:

`https://buusdocst.mtsu.workers.dev/{locale}/downloads`

(Legacy deep-link `/{locale}/settings#settings-desktop` redirects to `/downloads`.)

| Locale | Native name | English name | Region | Downloads |
|--------|-------------|--------------|--------|--------------------|
| `en` | English | English | global | [/en/downloads](https://buusdocst.mtsu.workers.dev/en/downloads) |
| `zh-Hans` | 简体中文 | Chinese (Simplified) | east-asia | [/zh-Hans/downloads](https://buusdocst.mtsu.workers.dev/zh-Hans/downloads) |
| `zh-Hant` | 繁體中文 | Chinese (Traditional) | east-asia | [/zh-Hant/downloads](https://buusdocst.mtsu.workers.dev/zh-Hant/downloads) |
| `ja` | 日本語 | Japanese | east-asia | [/ja/downloads](https://buusdocst.mtsu.workers.dev/ja/downloads) |
| `pt-PT` | Português (Portugal) | Portuguese (Portugal) | europe | [/pt-PT/downloads](https://buusdocst.mtsu.workers.dev/pt-PT/downloads) |
| `pt-BR` | Português (Brasil) | Portuguese (Brazil) | europe | [/pt-BR/downloads](https://buusdocst.mtsu.workers.dev/pt-BR/downloads) |
| `de` | Deutsch | German | europe | [/de/downloads](https://buusdocst.mtsu.workers.dev/de/downloads) |
| `fr` | Français | French | europe | [/fr/downloads](https://buusdocst.mtsu.workers.dev/fr/downloads) |
| `es` | Español | Spanish | europe | [/es/downloads](https://buusdocst.mtsu.workers.dev/es/downloads) |
| `it` | Italiano | Italian | europe | [/it/downloads](https://buusdocst.mtsu.workers.dev/it/downloads) |
| `nl` | Nederlands | Dutch | europe | [/nl/downloads](https://buusdocst.mtsu.workers.dev/nl/downloads) |
| `pl` | Polski | Polish | europe | [/pl/downloads](https://buusdocst.mtsu.workers.dev/pl/downloads) |
| `sv` | Svenska | Swedish | europe | [/sv/downloads](https://buusdocst.mtsu.workers.dev/sv/downloads) |
| `da` | Dansk | Danish | europe | [/da/downloads](https://buusdocst.mtsu.workers.dev/da/downloads) |
| `fi` | Suomi | Finnish | europe | [/fi/downloads](https://buusdocst.mtsu.workers.dev/fi/downloads) |
| `nb` | Norsk bokmål | Norwegian Bokmål | europe | [/nb/downloads](https://buusdocst.mtsu.workers.dev/nb/downloads) |
| `el` | Ελληνικά | Greek | europe | [/el/downloads](https://buusdocst.mtsu.workers.dev/el/downloads) |
| `cs` | Čeština | Czech | europe | [/cs/downloads](https://buusdocst.mtsu.workers.dev/cs/downloads) |
| `sk` | Slovenčina | Slovak | europe | [/sk/downloads](https://buusdocst.mtsu.workers.dev/sk/downloads) |
| `hu` | Magyar | Hungarian | europe | [/hu/downloads](https://buusdocst.mtsu.workers.dev/hu/downloads) |
| `ro` | Română | Romanian | europe | [/ro/downloads](https://buusdocst.mtsu.workers.dev/ro/downloads) |
| `bg` | Български | Bulgarian | europe | [/bg/downloads](https://buusdocst.mtsu.workers.dev/bg/downloads) |
| `hr` | Hrvatski | Croatian | europe | [/hr/downloads](https://buusdocst.mtsu.workers.dev/hr/downloads) |
| `sl` | Slovenščina | Slovenian | europe | [/sl/downloads](https://buusdocst.mtsu.workers.dev/sl/downloads) |
| `lt` | Lietuvių | Lithuanian | europe | [/lt/downloads](https://buusdocst.mtsu.workers.dev/lt/downloads) |
| `lv` | Latviešu | Latvian | europe | [/lv/downloads](https://buusdocst.mtsu.workers.dev/lv/downloads) |
| `et` | Eesti | Estonian | europe | [/et/downloads](https://buusdocst.mtsu.workers.dev/et/downloads) |
| `ga` | Gaeilge | Irish | europe | [/ga/downloads](https://buusdocst.mtsu.workers.dev/ga/downloads) |
| `mt` | Malti | Maltese | europe | [/mt/downloads](https://buusdocst.mtsu.workers.dev/mt/downloads) |
| `uk` | Українська | Ukrainian | europe | [/uk/downloads](https://buusdocst.mtsu.workers.dev/uk/downloads) |
| `is` | Íslenska | Icelandic | europe | [/is/downloads](https://buusdocst.mtsu.workers.dev/is/downloads) |
| `ca` | Català | Catalan | europe | [/ca/downloads](https://buusdocst.mtsu.workers.dev/ca/downloads) |
| `af` | Afrikaans | Afrikaans | southern-africa | [/af/downloads](https://buusdocst.mtsu.workers.dev/af/downloads) |
| `zu` | isiZulu | Zulu | southern-africa | [/zu/downloads](https://buusdocst.mtsu.workers.dev/zu/downloads) |
| `xh` | isiXhosa | Xhosa | southern-africa | [/xh/downloads](https://buusdocst.mtsu.workers.dev/xh/downloads) |
| `nso` | Sesotho sa Leboa | Northern Sotho | southern-africa | [/nso/downloads](https://buusdocst.mtsu.workers.dev/nso/downloads) |
| `st` | Sesotho | Southern Sotho | southern-africa | [/st/downloads](https://buusdocst.mtsu.workers.dev/st/downloads) |
| `tn` | Setswana | Tswana | southern-africa | [/tn/downloads](https://buusdocst.mtsu.workers.dev/tn/downloads) |
| `ss` | siSwati | Swati | southern-africa | [/ss/downloads](https://buusdocst.mtsu.workers.dev/ss/downloads) |
| `ve` | Tshivenḓa | Venda | southern-africa | [/ve/downloads](https://buusdocst.mtsu.workers.dev/ve/downloads) |
| `ts` | Xitsonga | Tsonga | southern-africa | [/ts/downloads](https://buusdocst.mtsu.workers.dev/ts/downloads) |
| `nr` | isiNdebele | Southern Ndebele | southern-africa | [/nr/downloads](https://buusdocst.mtsu.workers.dev/nr/downloads) |
| `mi` | Te reo Māori | Māori | pacific | [/mi/downloads](https://buusdocst.mtsu.workers.dev/mi/downloads) |
| `id` | Bahasa Indonesia | Indonesian | southeast-asia | [/id/downloads](https://buusdocst.mtsu.workers.dev/id/downloads) |
| `ms` | Bahasa Melayu | Malay | southeast-asia | [/ms/downloads](https://buusdocst.mtsu.workers.dev/ms/downloads) |
| `th` | ไทย | Thai | southeast-asia | [/th/downloads](https://buusdocst.mtsu.workers.dev/th/downloads) |
| `vi` | Tiếng Việt | Vietnamese | southeast-asia | [/vi/downloads](https://buusdocst.mtsu.workers.dev/vi/downloads) |
| `fil` | Filipino | Filipino | southeast-asia | [/fil/downloads](https://buusdocst.mtsu.workers.dev/fil/downloads) |
| `km` | ភាសាខ្មែរ | Khmer | southeast-asia | [/km/downloads](https://buusdocst.mtsu.workers.dev/km/downloads) |
| `lo` | ລາວ | Lao | southeast-asia | [/lo/downloads](https://buusdocst.mtsu.workers.dev/lo/downloads) |
| `my` | မြန်မာ | Burmese | southeast-asia | [/my/downloads](https://buusdocst.mtsu.workers.dev/my/downloads) |

Canonical English steps stay in this file. Locale packs carry `desktopDownloads*` + setup-guide link labels for the same Release URLs.
## Slack / ops

Slack webhook is **not** configured for this product ops path (skipped). Health failures still go through GitHub Actions email / watch notifications — see [`HEALTH_ALERTS.md`](HEALTH_ALERTS.md).
