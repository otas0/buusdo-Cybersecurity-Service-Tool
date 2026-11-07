# Chrome Web Store — listing draft (paste into Developer Dashboard)

Use with `npm run pack:chrome-store` and [EXTENSION_STORE_DISTRIBUTE.md](./EXTENSION_STORE_DISTRIBUTE.md).

## Store name (required)

**buusdo Cybersecurity Service Tool**

Do not list the item as only “buusdo”. Zip artifact: `buusdo-cybersecurity-service-tool-<version>.zip`.

## Short description (EN)

Check a website before you trust it — first-party threat list.

## Short description (alternate locale)

Verifique um site antes de confiar — lista própria de ameaças.

## Detailed description (EN)

buusdo Cybersecurity Service Tool (Buusdo product line) helps you check a website address before you enter sensitive information. Checks use our own curated threat list and live reachability — not third-party reputation APIs.

Privacy default: nothing is stored. Optional this-device-only block and trust lists stay on your computer; you can export or import them as JSON or QR.

Companion desktop app (optional): no TLS decryption, no process kill, system folders report-only — see Privacy → Honest limits on the website.

## Detailed description (alternate locale)

O buusdo Cybersecurity Service Tool (linha Buusdo) ajuda a verificar um endereço de site antes de introduzir informação sensível. As verificações usam a nossa lista curada de ameaças e acessibilidade em direto — não APIs de reputação de terceiros.

Predefinição de privacidade: nada é guardado. Listas de bloqueio/confiança opcionais só neste dispositivo ficam no seu computador; pode exportá-las ou importá-las em JSON ou QR.

App de ambiente de trabalho (opcional): sem desencriptação TLS, sem terminar processos, pastas de sistema só reportadas — ver Privacidade → Limites honestos no site.

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
| Privacy / desktop note | Companion desktop app: no TLS decryption, no process kill, system folders report-only — see Privacy → Honest limits. | App de ambiente de trabalho: sem desencriptação TLS, sem terminar processos, pastas de sistema só reportadas — ver Privacidade → Limites honestos. |

## Privacy policy URL

`https://buusdocst.mtsu.workers.dev/en/privacy`

## Homepage URL

`https://buusdocst.mtsu.workers.dev`

## China entry (when Workers is hard to reach)

`https://otas0.github.io/buusdocst/`