# Ops (first-party)

## Home-continue timeline chart

Open [`home-continue-timeline.html`](./home-continue-timeline.html) in a browser after:

```bash
npm run smoke:desktop-home-continue
```

Load `desktop-app/dist/smoke-currentDir-timeline.json` via the file picker (or serve the repo root so the relative fetch works). Data stays local — nothing is uploaded.

Nightly CI uploads the same JSON as the `mvp-nightly-logs` artifact.

Use **Export PNG** on the chart page for nightly ops archives (first-party canvas; no third-party).