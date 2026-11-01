# Privacy and Safety V0.1

## Data practice

No analytics, cookies for tracking, browsing-history store, call/SMS access, or credential capture. Checked URLs remain in current UI memory by default.

**Optional account (lists sync):** when `ACCOUNT_SYNC_ENABLED=1`, users may sign in with an email magic link to sync **personal block/trust lists only** (`shield-lists-v1`) across website, extension, and desktop. No check history or full URLs are uploaded. See [`docs/ACCOUNT_SYNC_V1.md`](ACCOUNT_SYNC_V1.md). Account is opt-in; Never store / This device only / Diagnostics modes remain. Without account sync, blocked and trusted domains stay only in browser/desktop local storage (or free export/QR).

Controlled sensitive forms prevent submission. Values are never read, transmitted, or stored. Users are told never to enter real information.

## Defensive boundary

No exploit code, malware, credential capture, phishing kit, bypass, cracking, intrusion, persistence, or real organisation cloning is included. Every simulated organisation and threat record is fictional.

## Future online provider minimisation

If a future provider is enabled, its adapter must document whether it transmits a full URL, hash prefix, or registrable domain; send the minimum required; expose the provider name and check time; keep keys in environment variables; and return `PROVIDER_UNAVAILABLE` on failure rather than silently degrading.