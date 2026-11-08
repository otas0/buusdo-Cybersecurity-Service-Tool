# Chrome Web Store — listing draft (paste into Developer Dashboard)

Use with `npm run pack:chrome-store` and [EXTENSION_STORE_DISTRIBUTE.md](./EXTENSION_STORE_DISTRIBUTE.md).

## Store name (required)

**buusdo Cybersecurity Service Tool**

Do not list the item as only “buusdo”. Zip artifact: `buusdo-cybersecurity-service-tool-<version>.zip`.

## Short description (EN)

Paste into Chrome Web Store Dashboard → Store listing → Short description (avoid Account / cloud-list wording).

Check a website before you trust it — first-party threat list, multi-language UI.

## Short description (pt-PT)

Verifique um site antes de confiar — lista própria de ameaças, interface multilingue.

## Short description (zh-Hans)

在信任网站前先检查 — 自有威胁列表，支持简体中文等界面语言。

## Short description (ja)

信頼する前にサイトを確認 — 独自の脅威リスト、日本語ほか多言語 UI。

## Detailed description (EN)

buusdo Cybersecurity Service Tool (Buusdo product line) helps you check a website address before you enter sensitive information. Checks use our own curated threat list and live reachability — not third-party reputation APIs.

Privacy default: nothing is stored. Optional this-device-only block and trust lists stay on your computer; you can export or import them as JSON or QR. There is no cloud account or cross-device list sync.

Companion desktop app (optional, GitHub Release): builds are **unsigned** (no Apple notarization / no Windows Authenticode on the current ship path). macOS Gatekeeper or Windows SmartScreen may warn on first open — expected; follow the setup guide on the website Settings → Desktop. Honest limits: no TLS decryption, no process kill, system folders report-only — see Privacy → Honest limits.

## Detailed description (alternate locale)

O buusdo Cybersecurity Service Tool (linha Buusdo) ajuda a verificar um endereço de site antes de introduzir informação sensível. As verificações usam a nossa lista curada de ameaças e acessibilidade em direto — não APIs de reputação de terceiros.

Predefinição de privacidade: nada é guardado. Listas de bloqueio/confiança opcionais só neste dispositivo ficam no seu computador; pode exportá-las ou importá-las em JSON ou QR. Não há conta na nuvem nem sincronização de listas entre dispositivos.

App de ambiente de trabalho (opcional, GitHub Release): builds **não assinadas** (sem notarização Apple / sem Authenticode Windows neste canal). O Gatekeeper (macOS) ou o SmartScreen (Windows) pode avisar na primeira abertura — esperado; siga o guia nas Definições → Ambiente de trabalho. Limites honestos: sem desencriptação TLS, sem terminar processos, pastas de sistema só reportadas — ver Privacidade → Limites honestos.

## Screenshots (upload order)

Instrument FRAMEs from `npm run capture:store-halt-frame` (also copied next to the zip by `npm run pack:chrome-store`):

| Order | File | Role |
|------:|------|------|
| 1 | `docs/store-screenshots/FRAME-formal-name.png` | Halt readout (primary) |
| 2 | `docs/store-screenshots/FRAME-clear.png` **and** `FRAME-hold.png` | Shot 2 pair — Clear + Hold |
| 3+ | Live popup / Settings / privacy captures | Prefer product UI for final submit |

## Screenshot captions (paste under each store screenshot)

| Shot | Caption EN | Caption alternate |
|------|------------|---------------|
| 1 — Halt | Halt: own threat list and brand-impersonation signals matched — do not enter credentials. | Halt: a lista própria e sinais de imitação de marca coincidiram — não introduza credenciais. |
| 2a — Clear | Clear: no strong first-party threat signals on this address — still decide carefully. | Clear: sem sinais fortes na lista própria neste endereço — decida com cuidado. |
| 2b — Hold | Hold: mixed or incomplete signals — confirm the address before you continue. | Hold: sinais mistos ou incompletos — confirme o endereço antes de continuar. |
| Settings | Reversible privacy and list choices on this device. | Escolhas de privacidade e listas reversíveis neste dispositivo. |
| Privacy / desktop note | Companion desktop (unsigned GitHub Release): Gatekeeper/SmartScreen may warn — expected. No TLS decryption, no process kill, system folders report-only. | App (Release não assinado): Gatekeeper/SmartScreen pode avisar — esperado. Sem desencriptação TLS, sem terminar processos, pastas de sistema só reportadas. |

## Privacy policy URL

`https://buusdocst.mtsu.workers.dev/en/privacy`

## Homepage URL

`https://buusdocst.mtsu.workers.dev`

## China entry (when Workers is hard to reach)

`https://otas0.github.io/buusdocst/`