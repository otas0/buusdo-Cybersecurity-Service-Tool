# Instrument terms (Halt / Hold / Clear / Standby)

Product instrument language — keep short and consistent across locales.

| Key | EN | Meaning | Notes |
|-----|----|---------|--------|
| `lightDanger` | Halt | Strong stop — leave before entering data | Prefer a short imperative; may keep Latin “Halt” in parentheses for EU locales |
| `lightCaution` | Hold | Pause / caution before continuing | Not “Warning” alone |
| `lightSafe` | Clear | No strong signal from checks run | Not a safety guarantee |
| `lightStandby` | Standby | Idle / ready for a check | |

## Preferred short forms

| Locale | Halt | Hold | Clear | Standby |
|--------|------|------|-------|---------|
| en | Halt | Hold | Clear | Standby |
| pt-PT | Parar | Pausar | Limpo | Pronto |
| pt-BR | Parar | Pausar | Limpo | Pronto |
| zh-Hans | 停止 | 暂缓 | 通过 | 待命 |
| zh-Hant | 停止 | 暫緩 | 通過 | 待命 |
| ja | 停止 | 保留 | 問題なし | 待機 |
| de | Halt | Halten | Klar | Bereit |
| fr | Stop | Attente | Clair | Veille |
| es | Alto | Espera | Claro | En espera |
| it | Stop | Trattieni | Pulito | Pronto |
| nl | Stop | Vasthouden | Vrij | Stand-by |
| pl | Stop | Wstrzymaj | Czysto | Gotowość |
| sv | Stopp | Håll | Rent | Redo |
| da | Stop | Hold | Klar | Klar |
| fi | Seis | Pidä | Selvä | Valmis |
| nb | Stopp | Hold | Rent | Klar |
| pt-BR | Parar | Pausar | Limpo | Pronto |
| ca | Atura | Retén | Clar | En espera |
| el | Στάση | Κράτηση | Καθαρό | Αναμονή |
| th | หยุด | ชะลอ | ผ่าน | พร้อม |
| mi | Tū | Tatari | Mahea | Tūrei |
| af | Stop | Wag | Skoon | Gereed |
| zu | Misa | Linda | Kucacile | Ulindile |
| xh | Nqumama | Linda | Kucacile | Ulindile |
| km | ឈប់ | ផ្អាក | ឆ្លង | រង់ចាំ |
| lo | ຢຸດ | ຊະລໍ | ຜ່ານ | ພ້ອມ |
| my | ရပ် | ဆိုင်း | အဆင်ပြေ | အဆင်သင့် |

When expanding packs, keep these four keys aligned with this table unless a native reviewer updates the row.

Toast Halt chips (extension overlay) use `lightDanger` — Stop / Alto / Parar / Halt / Stopp / Seis map 1:1 into `toastPhishing` via `sync-extension-sea-i18n` / `sync-toast-i18n`.
