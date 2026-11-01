# Shared assets (extension + desktop-app)

| File | Purpose |
|------|---------|
| `tokens.css` | CSS variables — dark Ookla-style identity |
| `detect.mjs` | Tracker hosts and phishing signals used by the desktop app and the website check |
| `log-client.mjs` | Optional support diagnostics (`{ source, threat_type }`) when privacyMode is share |

The Chrome extension keeps a copy of strings/rules inside `extension/` (MV3 package boundary). The desktop app reads these files directly via Express static + `require`.