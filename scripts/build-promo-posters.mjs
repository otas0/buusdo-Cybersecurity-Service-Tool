/**
 * Build dense A4 poster (EN + pt-PT + 中文) from i18n packs.
 * Mirror → docs/promo + public/promo. Cache-bust wordmark/QR.
 *
 *   npm run build:promo-posters
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promo = path.join(root, "docs/promo");
const publicPromo = path.join(root, "public/promo");
const wordmarkSrc = path.join(root, "public/brand/buusdo-wordmark-on-light.png");

fs.mkdirSync(promo, { recursive: true });
fs.mkdirSync(publicPromo, { recursive: true });
fs.copyFileSync(wordmarkSrc, path.join(promo, "buusdo-wordmark-on-light.png"));

function ensureQr(file, url) {
  execSync(`npx --yes qrcode@1.5.4 "${url}" -t svg -o "${file}"`, { stdio: "inherit" });
}
ensureQr(path.join(promo, "product-qr.svg"), "https://buusdocst.mtsu.workers.dev");
ensureQr(path.join(promo, "china-qr.svg"), "https://otas0.github.io/buusdocst/");

const v = createHash("sha256").update(fs.readFileSync(wordmarkSrc)).digest("hex").slice(0, 10);
fs.writeFileSync(path.join(promo, ".cachebust"), `${v}\n`);

const { getMessages } = await import(pathToFileURL(path.join(root, "i18n/messages.ts")).href);
const en = getMessages("en");
const pt = getMessages("pt-PT");
const zh = getMessages("zh-Hans");

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pane(lang, langAttr, t, labels) {
  const privacyPath =
    langAttr === "pt-PT" ? "pt-PT" : langAttr === "zh-Hans" ? "zh-Hans" : "en";
  return `
      <section class="pane${langAttr === "zh-Hans" ? " zh" : ""}" lang="${langAttr}">
        <div class="pane-head"><span class="lang">${esc(lang)}</span><span class="led" aria-hidden="true"></span></div>
        <h2>${esc(t.check)}</h2>
        <p class="lede">${esc(t.lightIdle)}</p>
        <div class="mod">
          <h3>${esc(labels.use)}</h3>
          <ol class="steps">
            <li><span class="n">01</span><span class="txt">${esc(t.nextStepLeave)}</span></li>
            <li><span class="n">02</span><span class="txt">${esc(t.nextStepNoCredentials)}</span></li>
            <li><span class="n">03</span><span class="txt">${esc(t.nextStepVerifyOfficial)}</span></li>
            <li><span class="n">04</span><span class="txt">${esc(t.nextStepBlock)}</span></li>
            <li><span class="n">05</span><span class="txt">${esc(t.nextStepReport)}</span></li>
          </ol>
        </div>
        <div class="mod">
          <h3>${esc(t.lightDanger)}</h3>
          <div class="see"><p><strong>${esc(t.leave)}</strong> — ${esc(t.ignoreRiskBody)}</p></div>
        </div>
        <div class="mod">
          <h3>${esc(labels.privacy)}</h3>
          <p>${esc(t.privacyNote)}</p>
          <p class="sub">${esc(t.privacyPolicyAccountBody)}</p>
        </div>
        <div class="mod">
          <h3>${esc(t.honestLimitsTitle)}</h3>
          <p>${esc(t.honestLimitNoWipe)}</p>
          <p class="sub">${esc(t.lightLimited)}</p>
        </div>
        <div class="mod fill">
          <h3>${esc(labels.surfaces)}</h3>
          <p>${esc(labels.surfacesBody)}</p>
          <p class="sub">${esc(t.nextStepLooksReal)}</p>
          <h3>${esc(labels.open)}</h3>
          <p><a href="https://buusdocst.mtsu.workers.dev">buusdocst.mtsu.workers.dev</a></p>
          <p><a href="https://otas0.github.io/buusdocst/">otas0.github.io/buusdocst</a> · ${esc(labels.china)}</p>
          <p><a href="https://buusdocst.mtsu.workers.dev/${privacyPath}/privacy">/${privacyPath}/privacy</a></p>
        </div>
      </section>`;
}

const labels = {
  en: {
    use: "Next",
    privacy: en.privacyLabel,
    limits: en.limits,
    surfaces: "Surfaces",
    surfacesBody: "Web · browser extension · desktop — local lists, reversible choices.",
    open: "Open",
    china: "China mirror",
    get: "Get it",
    getBody: "Scan live Worker or China Pages. EN / pt-PT / 中文.",
  },
  pt: {
    use: "A seguir",
    privacy: pt.privacyLabel,
    limits: pt.limits,
    surfaces: "Superfícies",
    surfacesBody: "Web · extensão · desktop — listas locais, escolhas reversíveis.",
    open: "Abrir",
    china: "espelho China",
    get: "Obter",
    getBody: "Leia o QR do Worker ou Pages China. EN / pt-PT / 中文.",
  },
  zh: {
    use: "下一步",
    privacy: zh.privacyLabel,
    limits: zh.limits,
    surfaces: "覆盖",
    surfacesBody: "网页 · 浏览器扩展 · 桌面端 — 本机列表，选择可撤销。",
    open: "打开",
    china: "中国镜像",
    get: "获取",
    getBody: "扫码打开线上 Worker 或中国 Pages。EN / pt-PT / 中文。",
  },
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(en.prototype)} (A4) · EN / pt-PT / 中文</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #ffffff; --ink: #111111; --muted: #6b6b6b; --line: #111111;
      --hair: #d8d8d8; --halt: #ff4d00; --wash: #f4f4f4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #cfcfcf; color: var(--ink);
      font-family: "Space Grotesk", "Noto Sans SC", "PingFang SC", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .screen-hint {
      width: 210mm; margin: 8px auto 6px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 10px; text-align: center; color: #333;
    }
    .sheet {
      width: 210mm; height: 297mm; margin: 0 auto 12px;
      padding: 7mm 7mm 6mm; background: var(--bg); border: 1px solid #111;
      display: flex; flex-direction: column; overflow: hidden; color: var(--ink);
      isolation: isolate;
    }
    .topbar {
      display: grid; grid-template-columns: auto 1fr auto; align-items: center;
      gap: 5mm; padding-bottom: 4mm; border-bottom: 1px solid var(--line); flex: 0 0 auto;
    }
    .logo { width: 38mm; height: auto; max-height: 13mm; object-fit: contain; object-position: left center; display: block; }
    .top-mid { display: flex; flex-direction: column; gap: 1.8mm; min-width: 0; }
    .id-row { display: flex; align-items: center; gap: 2.5mm; flex-wrap: wrap; }
    .id-row .name {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 8.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
    }
    .boost { display: inline-flex; align-items: center; height: 8px; }
    .boost i { display: block; width: 5px; height: 8px; background: var(--ink); transform: skewX(-18deg); }
    .boost i:nth-child(2) { margin-left: 1.5px; background: var(--muted); }
    .boost i:nth-child(3) { width: 3px; margin-left: 1.5px; background: var(--halt); }
    .top-mid h1 { font-size: 15px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.15; }
    .top-side {
      text-align: right; font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 8px; line-height: 1.45; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted);
    }
    .top-side strong { display: block; color: var(--ink); font-weight: 600; margin-bottom: 0.8mm; }
    .signal {
      display: grid; grid-template-columns: repeat(5, 1fr);
      border: 1px solid var(--line); border-top: 0; flex: 0 0 auto;
    }
    .sig {
      /* −2mm vs prior strip: bilingual small type only */
      padding: 1.1mm 1.6mm 1.2mm; border-right: 1px solid var(--line); min-height: 10mm;
      display: flex; flex-direction: column; justify-content: space-between; gap: 0.6mm;
    }
    .sig:last-child { border-right: 0; background: var(--ink); color: #fff; }
    .sig .code {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 6px; font-weight: 500; letter-spacing: 0.08em; color: var(--muted);
    }
    .sig:last-child .code { color: #9a9a9a; }
    .sig .label {
      font-size: 7px; font-weight: 600; letter-spacing: 0.01em; line-height: 1.2;
      font-family: "IBM Plex Mono", "Noto Sans SC", ui-monospace, monospace;
    }
    .sig .mark { width: 100%; height: 1.5px; background: var(--hair); position: relative; overflow: hidden; }
    .sig .mark::after { content: ""; position: absolute; inset: 0 auto 0 0; width: 55%; background: var(--ink); }
    .sig:nth-child(2) .mark::after { width: 70%; }
    .sig:nth-child(3) .mark::after { width: 85%; }
    .sig:nth-child(4) .mark::after { width: 92%; background: var(--halt); }
    .sig:last-child .mark { background: #333; }
    .sig:last-child .mark::after { width: 100%; background: var(--halt); }
    .body {
      flex: 1 1 auto; min-height: 0;
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      border: 1px solid var(--line); border-top: 0;
      overflow: hidden; /* clip pane overflow — never paint under dock/QR */
      position: relative; z-index: 0;
    }
    .pane {
      padding: 3mm 2.8mm 2.8mm; border-right: 1px solid var(--line);
      display: flex; flex-direction: column; gap: 2.2mm; min-width: 0; min-height: 0;
      background: var(--bg); overflow: hidden;
    }
    .pane:last-child { border-right: 0; }
    .pane .fill { margin-top: auto; padding-top: 2mm; border-top: 1px solid var(--hair); flex: 0 0 auto; }
    .pane .sub { margin-top: 1mm; font-size: 7.8px; line-height: 1.3; color: #333; }
    .pane-head {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 1.6mm; border-bottom: 1px solid var(--hair); flex: 0 0 auto;
    }
    .pane-head .lang {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 8.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
    }
    .pane-head .led { width: 5px; height: 5px; background: var(--halt); transform: skewX(-18deg); }
    .pane h2 { font-size: 12px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }
    .zh h2 { font-family: "Noto Sans SC", "PingFang SC", sans-serif; font-weight: 700; letter-spacing: 0; }
    .lede { font-size: 8.6px; line-height: 1.35; color: #222; }
    .zh .lede, .zh .mod p, .zh .mod li, .zh .mod { font-family: "Noto Sans SC", "PingFang SC", sans-serif; }
    .mod { flex: 0 0 auto; }
    .mod h3 {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 1.2mm;
      display: flex; align-items: center; gap: 1.5mm;
    }
    .mod h3::before { content: ""; width: 4.5px; height: 4.5px; background: var(--halt); transform: skewX(-18deg); }
    .mod p { font-size: 8.4px; line-height: 1.35; }
    .steps { list-style: none; border: 1px solid var(--hair); }
    .steps li {
      display: grid; grid-template-columns: 6.5mm 1fr; border-bottom: 1px solid var(--hair); min-height: 0;
    }
    .steps li:last-child { border-bottom: 0; }
    .steps .n {
      font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 8px; font-weight: 600;
      display: grid; place-items: center; border-right: 1px solid var(--hair);
      color: var(--muted); background: var(--wash); padding: 1.2mm 0;
    }
    .steps .txt { padding: 1.4mm 1.8mm; font-size: 8.2px; line-height: 1.3; display: flex; align-items: center; }
    .see { border-left: 2px solid var(--halt); padding: 1mm 0 1mm 2.2mm; background: #fff8f5; }
    .see p { font-size: 8.4px; line-height: 1.35; font-weight: 500; }
    .fill a {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7.4px; color: var(--ink); word-break: break-all; text-underline-offset: 1px;
    }
    .dock {
      /* minmax(0,1fr) so long URLs wrap; QR 15mm stay in min-content — never overlap panes */
      display: grid; grid-template-columns: minmax(0, 1fr) min-content minmax(0, 1fr);
      gap: 3mm; align-items: center;
      border: 1px solid var(--line); border-top: 0; padding: 2.5mm 3mm; flex: 0 0 auto;
      background: var(--wash); overflow: hidden;
      position: relative; z-index: 1;
    }
    .dock .side { min-width: 0; overflow-wrap: anywhere; }
    .dock .side h3 {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 1mm; display: flex; align-items: center; gap: 1.5mm;
    }
    .dock .side h3::before { content: ""; width: 4.5px; height: 4.5px; background: var(--halt); transform: skewX(-18deg); }
    .dock .side p { font-size: 7.6px; line-height: 1.3; }
    .dock .side.zh { text-align: right; font-family: "Noto Sans SC", "PingFang SC", sans-serif; }
    .dock .side.zh h3 { justify-content: flex-end; }
    .dock .url {
      margin-top: 1mm; font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 6.5px; color: var(--muted); word-break: break-all;
    }
    .dock .qrs {
      display: flex; flex-direction: row; gap: 2mm; flex: 0 0 auto;
      align-items: stretch;
    }
    .qr-box {
      width: 19mm; border: 1px solid var(--line); padding: 1.2mm; background: #fff;
      display: grid; gap: 0.6mm; justify-items: center; align-content: center;
      flex: 0 0 auto;
    }
    .qr-box img { width: 15mm; height: 15mm; display: block; }
    .qr-box span {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 5.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
    }
    .foot {
      border: 1px solid var(--line); border-top: 0; flex: 0 0 auto;
      display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0;
      background: #fff; position: relative; z-index: 1;
    }
    .foot .cell {
      padding: 2.8mm 2.8mm 3mm; border-right: 1px solid var(--hair);
      font-size: 7.6px; line-height: 1.35; min-height: 18mm;
    }
    .foot .cell:last-child { border-right: 0; }
    .foot .cell h3 {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 1.2mm;
      display: flex; align-items: center; gap: 1.5mm;
    }
    .foot .cell h3::before { content: ""; width: 4px; height: 4px; background: var(--halt); transform: skewX(-18deg); }
    .foot .cell a {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7px; color: var(--ink); word-break: break-all;
    }
    .foot .cell .zh-line { font-family: "Noto Sans SC", "PingFang SC", sans-serif; }
    .foot .cell strong {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 8px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
      display: block; margin-bottom: 1mm;
    }
    @media print {
      html, body {
        background: #fff !important; width: 210mm; height: 297mm;
        margin: 0 !important; padding: 0 !important; overflow: hidden;
      }
      .screen-hint { display: none !important; }
      .sheet {
        width: 210mm !important; height: 297mm !important; max-width: 210mm; max-height: 297mm;
        margin: 0 !important; border: none !important;
        page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>
  <p class="screen-hint">A4 sheet · EN / pt-PT / 中文 · QR 15mm live + China · v=${v}</p>
  <article class="sheet">
    <header class="topbar">
      <img class="logo" src="buusdo-wordmark-on-light.png?v=${v}" alt="${esc(en.prototype)}" width="405" height="138" />
      <div class="top-mid">
        <div class="id-row">
          <span class="name">${esc(en.prototype)}</span>
          <span class="boost" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
        <h1>${esc(en.shieldSubtitle)} — ${esc(en.check)}</h1>
      </div>
      <div class="top-side">
        <strong>Spec</strong>
        Web · Extension · Desktop<br />
        EN / pt-PT / 中文<br />
        ${esc(en.privacyOff)} · ${esc(en.privacyLocal)}
      </div>
    </header>

    <section class="signal" aria-label="Status">
      <div class="sig"><span class="code">CH 01</span><span class="label">${esc(en.lightStandby)} · ${esc(pt.lightStandby)} · ${esc(zh.lightStandby)}</span><span class="mark" aria-hidden="true"></span></div>
      <div class="sig"><span class="code">CH 02</span><span class="label">${esc(en.lightSafe)} · ${esc(pt.lightSafe)} · ${esc(zh.lightSafe)}</span><span class="mark" aria-hidden="true"></span></div>
      <div class="sig"><span class="code">CH 03</span><span class="label">${esc(en.lightCaution)} · ${esc(pt.lightCaution)} · ${esc(zh.lightCaution)}</span><span class="mark" aria-hidden="true"></span></div>
      <div class="sig"><span class="code">CH 04</span><span class="label">${esc(en.navCheck)} · ${esc(pt.navCheck)} · ${esc(zh.navCheck)}</span><span class="mark" aria-hidden="true"></span></div>
      <div class="sig"><span class="code">OUT</span><span class="label">${esc(en.lightDanger)} · ${esc(pt.lightDanger)} · ${esc(zh.lightDanger)}</span><span class="mark" aria-hidden="true"></span></div>
    </section>

    <div class="body">
      ${pane("English", "en", en, labels.en)}
      ${pane("Português", "pt-PT", pt, labels.pt)}
      ${pane("中文", "zh-Hans", zh, labels.zh)}
    </div>

    <footer class="dock">
      <div class="side" lang="en">
        <h3>${esc(labels.en.get)}</h3>
        <p>${esc(labels.en.getBody)}</p>
        <p class="url">buusdocst.mtsu.workers.dev</p>
        <p class="url" lang="pt-PT">${esc(labels.pt.get)} · ${esc(labels.pt.china)}</p>
      </div>
      <div class="qrs" aria-label="QR">
        <div class="qr-box">
          <img src="product-qr.svg?v=${v}" alt="QR live" width="100" height="100" />
          <span>live</span>
        </div>
        <div class="qr-box">
          <img src="china-qr.svg?v=${v}" alt="QR China" width="100" height="100" />
          <span>china</span>
        </div>
      </div>
      <div class="side zh" lang="zh-Hans">
        <h3>${esc(labels.zh.get)}</h3>
        <p>${esc(labels.zh.getBody)}</p>
        <p class="url">otas0.github.io/buusdocst</p>
      </div>
    </footer>

    <section class="foot" aria-label="Privacy · open">
      <div class="cell">
        <strong>${esc(en.prototype)}</strong>
        <p>${esc(en.privacyOff)} · ${esc(en.privacyLocal)}</p>
        <p class="zh-line" lang="zh-Hans">${esc(zh.privacyOff)} · ${esc(zh.privacyLocal)}</p>
        <p lang="pt-PT">${esc(pt.privacyOff)} · ${esc(pt.privacyLocal)}</p>
      </div>
      <div class="cell">
        <h3>${esc(en.privacyLabel)} / ${esc(pt.privacyLabel)} / ${esc(zh.privacyLabel)}</h3>
        <p><a href="https://buusdocst.mtsu.workers.dev/en/privacy">/en/privacy</a></p>
        <p><a href="https://buusdocst.mtsu.workers.dev/pt-PT/privacy">/pt-PT/privacy</a></p>
        <p><a href="https://buusdocst.mtsu.workers.dev/zh-Hans/privacy">/zh-Hans/privacy</a></p>
      </div>
      <div class="cell">
        <h3>${esc(labels.en.open)} / ${esc(labels.pt.open)} / ${esc(labels.zh.open)}</h3>
        <p><a href="https://buusdocst.mtsu.workers.dev">buusdocst.mtsu.workers.dev</a></p>
        <p><a href="https://otas0.github.io/buusdocst/">otas0.github.io/buusdocst</a></p>
        <p class="zh-line" lang="zh-Hans">${esc(labels.zh.china)} · ${esc(labels.en.china)}</p>
      </div>
    </section>
  </article>
</body>
</html>
`;

fs.writeFileSync(path.join(promo, "poster.html"), html);
fs.writeFileSync(
  path.join(promo, "poster-pt.html"),
  `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url=poster.html"/><title>Redirect</title></head><body><p><a href="poster.html">A4 poster (EN / pt-PT / 中文)</a></p></body></html>\n`,
);
fs.writeFileSync(
  path.join(promo, "README.md"),
  `# Promo posters (A4)

- \`poster.html\` — dense **EN + pt-PT + 中文** from \`i18n/messages\` + \`zh-Hans\` pack
- \`poster-pt.html\` — meta-refresh redirect → \`poster.html\` (legacy pt-only URL; keep for old links)
- Copy keys: \`check\`, \`lightIdle\`, \`nextStep*\`, \`leave\`, \`ignoreRiskBody\`, \`privacyNote\`, \`lightLimited\`, status words
- QRs: live Worker + China Pages
- Rebuild: \`npm run build:promo-posters\` then \`npm run assert:promo-i18n\`
- Optional PDF: \`npm run export:promo-poster-pdf\`
  - \`PLAYWRIGHT_BROWSERS_PATH\`: if unset on macOS and \`~/Library/Caches/ms-playwright\` exists, the export script uses that; else Playwright default (\`~/.cache/ms-playwright\` on Linux). Launch tries bundled Chromium, then \`channel=chrome\`.
  - Explicit: \`PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" npm run export:promo-poster-pdf\`
  - Missing browsers: \`npx playwright install chromium\`
- Local privacy routes: \`PROMO_ORIGIN=http://127.0.0.1:3000 npm run assert:promo-privacy-routes\` (CI quality starts vinext on :3000)
- Dock: QR **15mm** glyphs in \`min-content\` column; body \`overflow:hidden\` so panes never paint under QR
- No print tips on the sheet (Print QA lives only in this README)

## Offline soft-skip (\`assert:promo-privacy-routes\`)

When \`PROMO_ORIGIN\` is unreachable (Workers timeout, no local vinext, DNS fail), the script **soft-skips** that URL and continues — it does **not** hard-fail the whole assert on network errors. Hard-fail only when the origin responds with a non-2xx status. For ship gates that must not depend on the network, use the local fixture:

- \`tests/fixtures/privacy-no-survey.html\` + \`tests/privacy-fixture-no-survey.test.ts\` (zero \`/survey/\` links, no Workers).

## Print QA (fit one page)

1. Open \`poster.html\` (or \`/promo/poster.html\` on Workers).
2. Print → Paper **A4** · Scale **100%** · Margins **None** · **Background graphics** On.
3. Do not use “Fit to printable area” if margins are already None — sheet is exactly 210×297 mm.
4. **Physical QA:** one hard-copy A4 at 100% / no margins; charcoal u-card (\`#545454\`); footer not clipped.
5. **QR scan (15mm):** phone camera must resolve both LIVE (Workers) and CHINA (Pages) codes after print — if scan fails, bump glyph above 15mm and rebuild.

u-card: [BRAND_U_CARD.md](../BRAND_U_CARD.md) (\`#545454\` on light).
`,
);

for (const name of [
  "poster.html",
  "poster-pt.html",
  "buusdo-wordmark-on-light.png",
  "product-qr.svg",
  "china-qr.svg",
  "README.md",
  ".cachebust",
]) {
  fs.copyFileSync(path.join(promo, name), path.join(publicPromo, name));
}

console.info(`[build-promo-posters] OK v=${v} dense trilingual from i18n → docs/promo + public/promo`);
