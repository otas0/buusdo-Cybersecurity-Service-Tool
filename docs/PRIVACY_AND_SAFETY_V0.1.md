# Privacy and Safety V0.1

## Data practice

No analytics, cookies for tracking, browsing-history store, call/SMS access, or credential capture. Checked URLs remain in current UI memory by default.

**No cloud account sync:** personal block/trust lists stay on-device. Move them with export/import of `shield-lists-v1` JSON or QR, or sync desktop `shield-backup.json` (USB / Drive / Syncthing). See [`docs/OFFLINE_LIST_SYNC.md`](OFFLINE_LIST_SYNC.md) and [`docs/ACCOUNT_SYNC_GATE.md`](ACCOUNT_SYNC_GATE.md).

Controlled sensitive forms prevent submission. Values are never read, transmitted, or stored. Users are told never to enter real information.

## Defensive boundary

No exploit code, malware, credential capture, phishing kit, bypass, cracking, intrusion, persistence, or real organisation cloning is included. Every simulated organisation and threat record is fictional.

## Future online provider minimisation

If a future provider is enabled, its adapter must document whether it transmits a full URL, hash prefix, or registrable domain; send the minimum required; expose the provider name and check time; keep keys in environment variables; and return `PROVIDER_UNAVAILABLE` on failure rather than silently degrading.