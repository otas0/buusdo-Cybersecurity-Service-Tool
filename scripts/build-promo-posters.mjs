/**
 * Build A4 print poster (EN + pt-PT + 中文) into docs/promo and mirror to public/promo.
 * Cache-busts wordmark/QR from on-light PNG sha256 prefix.
 * Print: exact A4 box, zero @page margin, compact padding so one page fits.
 *
 *   node scripts/build-promo-posters.mjs
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promo = path.join(root, "docs/promo");
const publicPromo = path.join(root, "public/promo");
const wordmarkSrc = path.join(root, "public/brand/buusdo-wordmark-on-light.png");

fs.mkdirSync(promo, { recursive: true });
fs.mkdirSync(publicPromo, { recursive: true });
fs.copyFileSync(wordmarkSrc, path.join(promo, "buusdo-wordmark-on-light.png"));

function ensureQr(file, url) {
  if (fs.existsSync(file)) return;
  execSync(`npx --yes qrcode@1.5.4 "${url}" -t svg -o "${file}"`, { stdio: "inherit" });
}

ensureQr(path.join(promo, "product-qr.svg"), "https://buusdocst.mtsu.workers.dev");
ensureQr(path.join(promo, "china-qr.svg"), "https://otas0.github.io/buusdocst/");

const v = createHash("sha256").update(fs.readFileSync(wordmarkSrc)).digest("hex").slice(0, 10);
fs.writeFileSync(path.join(promo, ".cachebust"), `${v}\n`);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>buusdo Cybersecurity Service Tool (A4) · EN / pt-PT / 中文</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #ffffff;
      --ink: #111111;
      --muted: #6b6b6b;
      --line: #111111;
      --hair: #d8d8d8;
      --halt: #ff4d00;
      --wash: #f7f7f7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #cfcfcf;
      color: var(--ink);
      font-family: "Space Grotesk", "Noto Sans SC", "PingFang SC", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .screen-hint {
      width: 210mm; margin: 8px auto 6px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 10px; text-align: center; color: #333;
    }
    /* Exact A4 content box (padding inside 210×297). */
    .sheet {
      width: 210mm;
      height: 297mm;
      margin: 0 auto 12px;
      padding: 6.5mm 6mm 5.5mm;
      background: var(--bg);
      border: 1px solid #111;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: var(--ink);
    }
    .topbar {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 4mm;
      padding-bottom: 3.5mm;
      border-bottom: 1px solid var(--line);
      flex: 0 0 auto;
    }
    .logo {
      width: 34mm; height: auto; max-height: 12mm;
      object-fit: contain; object-position: left center; display: block;
    }
    .top-mid { display: flex; flex-direction: column; gap: 1.5mm; min-width: 0; }
    .id-row { display: flex; align-items: center; gap: 2.5mm; flex-wrap: wrap; }
    .id-row .name {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 8px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    }
    .boost { display: inline-flex; align-items: center; height: 7px; }
    .boost i { display: block; width: 5px; height: 7px; background: var(--ink); transform: skewX(-18deg); }
    .boost i:nth-child(2) { margin-left: 1.5px; background: var(--muted); }
    .boost i:nth-child(3) { width: 3px; margin-left: 1.5px; background: var(--halt); }
    .top-mid h1 { font-size: 14px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.15; }
    .top-side {
      text-align: right; font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7.5px; line-height: 1.45; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted);
    }
    .top-side strong { display: block; color: var(--ink); font-weight: 600; margin-bottom: 0.6mm; }
    .signal {
      display: grid; grid-template-columns: repeat(5, 1fr);
      border: 1px solid var(--line); border-top: 0; flex: 0 0 auto;
    }
    .sig {
      padding: 2.2mm 2mm; border-right: 1px solid var(--line); min-height: 13mm;
      display: flex; flex-direction: column; justify-content: space-between; gap: 1.5mm;
    }
    .sig:last-child { border-right: 0; }
    .sig .code {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7px; font-weight: 500; letter-spacing: 0.08em; color: var(--muted);
    }
    .sig .label { font-size: 10px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
    .sig .mark { width: 100%; height: 2.5px; background: var(--hair); position: relative; overflow: hidden; }
    .sig .mark::after { content: ""; position: absolute; inset: 0 auto 0 0; width: 55%; background: var(--ink); }
    .sig:nth-child(2) .mark::after { width: 70%; }
    .sig:nth-child(3) .mark::after { width: 85%; }
    .sig:nth-child(4) .mark::after { width: 92%; background: var(--halt); }
    .sig:last-child { background: var(--ink); color: #fff; }
    .sig:last-child .code { color: #9a9a9a; }
    .sig:last-child .mark { background: #333; }
    .sig:last-child .mark::after { width: 100%; background: var(--halt); }
    .body {
      flex: 1 1 auto;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      border: 1px solid var(--line);
      border-top: 0;
      min-height: 0;
    }
    .pane {
      padding: 3.2mm 2.8mm 3mm;
      display: flex; flex-direction: column; gap: 2.8mm;
      min-width: 0; min-height: 0; background: var(--bg);
      border-right: 1px solid var(--line);
    }
    .pane:last-child { border-right: 0; }
    .pane-head {
      display: flex; align-items: center; justify-content: space-between; gap: 2mm;
      padding-bottom: 1.6mm; border-bottom: 1px solid var(--hair); flex: 0 0 auto;
    }
    .pane-head .lang {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 8px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
    }
    .pane-head .led { width: 5px; height: 5px; background: var(--halt); transform: skewX(-18deg); flex: 0 0 auto; }
    .pane h2 { font-size: 11px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; flex: 0 0 auto; }
    .zh h2 { font-family: "Noto Sans SC", "PingFang SC", "Space Grotesk", sans-serif; font-size: 11px; letter-spacing: 0; font-weight: 700; }
    .mod h3 {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 1.2mm;
      display: flex; align-items: center; gap: 1.5mm;
    }
    .mod h3::before { content: ""; width: 4.5px; height: 4.5px; background: var(--halt); transform: skewX(-18deg); flex: 0 0 auto; }
    .mod p, .mod li { font-size: 8.5px; line-height: 1.32; font-weight: 400; }
    .zh .mod p, .zh .mod li, .zh .mod { font-family: "Noto Sans SC", "PingFang SC", "Space Grotesk", sans-serif; }
    .steps { list-style: none; border: 1px solid var(--hair); }
    .steps li { display: grid; grid-template-columns: 6.5mm 1fr; border-bottom: 1px solid var(--hair); min-height: 7mm; }
    .steps li:last-child { border-bottom: 0; }
    .steps .n {
      font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 8px; font-weight: 600;
      display: grid; place-items: center; border-right: 1px solid var(--hair); color: var(--muted); background: var(--wash);
    }
    .steps .txt { padding: 1.2mm 1.6mm; display: flex; align-items: center; font-size: 8.2px; line-height: 1.25; }
    .see { border-left: 2px solid var(--halt); padding: 0.8mm 0 0.8mm 2mm; }
    .see p { font-size: 8.8px; font-weight: 500; line-height: 1.3; }
    .facts { margin-top: auto; display: grid; gap: 1.5mm; padding-top: 2mm; border-top: 1px solid var(--hair); }
    .facts p { font-size: 7.8px; line-height: 1.3; color: #222; }
    .facts a {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7.2px; color: var(--ink); word-break: break-all; text-underline-offset: 1px;
    }
    .dock {
      display: grid; grid-template-columns: 1fr auto auto 1fr;
      gap: 3mm; align-items: center;
      border: 1px solid var(--line); border-top: 0;
      padding: 3mm 3.5mm; flex: 0 0 auto; background: var(--bg);
    }
    .dock .side h3 {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 7.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 1mm;
      display: flex; align-items: center; gap: 1.5mm;
    }
    .dock .side h3::before { content: ""; width: 4.5px; height: 4.5px; background: var(--halt); transform: skewX(-18deg); }
    .dock .side p { font-size: 8px; line-height: 1.3; }
    .dock .side.zh { text-align: right; font-family: "Noto Sans SC", "PingFang SC", "Space Grotesk", sans-serif; }
    .dock .side.zh h3 { justify-content: flex-end; }
    .dock .url { margin-top: 1mm; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 7px; color: var(--muted); }
    .qr-box {
      width: 22mm; border: 1px solid var(--line); padding: 1.5mm;
      background: #fff; display: grid; gap: 0.8mm; justify-items: center;
    }
    .qr-box img { width: 17mm; height: 17mm; display: block; }
    .qr-box span {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 6.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
    }
    @media print {
      html, body {
        background: #fff !important;
        width: 210mm;
        height: 297mm;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden;
      }
      .screen-hint { display: none !important; }
      .sheet {
        width: 210mm !important;
        height: 297mm !important;
        max-width: 210mm;
        max-height: 297mm;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        page-break-after: avoid;
        page-break-inside: avoid;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>
  <p class="screen-hint">A4 · Print → Paper A4 · Scale 100% · Margins None · Background graphics On · v=${v}</p>
  <article class="sheet">
    <header class="topbar">
      <img class="logo" src="buusdo-wordmark-on-light.png?v=${v}" alt="buusdo Cybersecurity Service Tool" width="405" height="138" />
      <div class="top-mid">
        <div class="id-row">
          <span class="name">buusdo Cybersecurity Service Tool</span>
          <span class="boost" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
        <h1>Check a website before you trust it.</h1>
      </div>
      <div class="top-side">
        <strong>Spec</strong>
        Web · Extension · Desktop<br />
        EN / pt-PT / 中文<br />
        Local · Reversible
      </div>
    </header>

    <section class="signal" aria-label="Flow">
      <div class="sig"><span class="code">CH 01</span><span class="label">Open</span><span class="mark" aria-hidden="true"></span></div>
      <div class="sig"><span class="code">CH 02</span><span class="label">Threats</span><span class="mark" aria-hidden="true"></span></div>
      <div class="sig"><span class="code">CH 03</span><span class="label">Probe</span><span class="mark" aria-hidden="true"></span></div>
      <div class="sig"><span class="code">CH 04</span><span class="label">Risk</span><span class="mark" aria-hidden="true"></span></div>
      <div class="sig"><span class="code">OUT</span><span class="label">Halt</span><span class="mark" aria-hidden="true"></span></div>
    </section>

    <div class="body">
      <section class="pane" lang="en">
        <div class="pane-head"><span class="lang">English</span><span class="led" aria-hidden="true"></span></div>
        <h2>Real signals. Clear risk. Leave when you should.</h2>
        <div class="mod">
          <h3>Use</h3>
          <ol class="steps">
            <li><span class="n">01</span><span class="txt">Open the site → paste a URL or open a page in the extension</span></li>
            <li><span class="n">02</span><span class="txt">Match own threat lists → probe the host → read the risk</span></li>
            <li><span class="n">03</span><span class="txt">On Halt, leave — lists stay local and reversible</span></li>
          </ol>
        </div>
        <div class="mod"><h3>See it</h3><div class="see"><p>Sharp instrument layout, one orange Halt — evidence to act on.</p></div></div>
        <div class="mod facts">
          <h3>What it is</h3>
          <p>First-party threat match, host probe, and risk UX on web, extension, and desktop. Privacy choices stay on this device.</p>
          <h3>Open</h3>
          <p><a href="https://buusdocst.mtsu.workers.dev">buusdocst.mtsu.workers.dev</a></p>
          <p><a href="https://otas0.github.io/buusdocst/">otas0.github.io/buusdocst</a> · China</p>
        </div>
      </section>

      <section class="pane" lang="pt-PT">
        <div class="pane-head"><span class="lang">Português</span><span class="led" aria-hidden="true"></span></div>
        <h2>Sinais reais. Risco claro. Saia quando deve.</h2>
        <div class="mod">
          <h3>Usar</h3>
          <ol class="steps">
            <li><span class="n">01</span><span class="txt">Abra o site → cole um URL ou abra na extensão</span></li>
            <li><span class="n">02</span><span class="txt">Listas próprias → probe do host → leia o risco</span></li>
            <li><span class="n">03</span><span class="txt">Em Halt, saia — listas locais e reversíveis</span></li>
          </ol>
        </div>
        <div class="mod"><h3>Ver</h3><div class="see"><p>Instrumento nítido, um Halt laranja — evidência para agir.</p></div></div>
        <div class="mod facts">
          <h3>O que é</h3>
          <p>Ameaça própria, probe e UX de risco na web, extensão e desktop. Privacidade neste dispositivo.</p>
          <h3>Abrir</h3>
          <p><a href="https://buusdocst.mtsu.workers.dev">buusdocst.mtsu.workers.dev</a></p>
          <p><a href="https://otas0.github.io/buusdocst/">otas0.github.io/buusdocst</a> · China</p>
        </div>
      </section>

      <section class="pane zh" lang="zh-Hans">
        <div class="pane-head"><span class="lang">中文</span><span class="led" aria-hidden="true"></span></div>
        <h2>真实信号。清晰风险。该离开时离开。</h2>
        <div class="mod">
          <h3>使用</h3>
          <ol class="steps">
            <li><span class="n">01</span><span class="txt">打开站点 → 粘贴 URL，或在扩展里打开</span></li>
            <li><span class="n">02</span><span class="txt">自有威胁列表 → 探测主机 → 查看风险</span></li>
            <li><span class="n">03</span><span class="txt">Halt 时离开 — 列表本机可逆</span></li>
          </ol>
        </div>
        <div class="mod"><h3>效果</h3><div class="see"><p>清晰仪器版式、一处 Halt 橙 — 可据以行动的证据。</p></div></div>
        <div class="mod facts">
          <h3>它是什么</h3>
          <p>自有威胁匹配、主机探测与风险界面，覆盖网页、扩展与桌面。隐私选择留在本机。</p>
          <h3>打开</h3>
          <p><a href="https://buusdocst.mtsu.workers.dev">buusdocst.mtsu.workers.dev</a></p>
          <p><a href="https://otas0.github.io/buusdocst/">otas0.github.io/buusdocst</a> · 中国镜像</p>
        </div>
      </section>
    </div>

    <footer class="dock">
      <div class="side" lang="en">
        <h3>Get it</h3>
        <p>Scan live site or China mirror. Web · extension · desktop.</p>
        <p class="url">buusdocst.mtsu.workers.dev</p>
      </div>
      <div class="qr-box">
        <img src="product-qr.svg?v=${v}" alt="QR live site" width="100" height="100" />
        <span>live</span>
      </div>
      <div class="qr-box">
        <img src="china-qr.svg?v=${v}" alt="QR China mirror" width="100" height="100" />
        <span>china</span>
      </div>
      <div class="side zh" lang="zh-Hans">
        <h3>获取</h3>
        <p>扫码打开线上或中国镜像。网页 · 扩展 · 桌面。</p>
        <p class="url">otas0.github.io/buusdocst</p>
      </div>
    </footer>
  </article>
</body>
</html>
`;

fs.writeFileSync(path.join(promo, "poster.html"), html);
// Alias: old pt URL redirects via meta (keep bookmark working).
fs.writeFileSync(
  path.join(promo, "poster-pt.html"),
  `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url=poster.html"/><title>Redirect</title></head><body><p><a href="poster.html">A4 poster (EN / pt-PT / 中文)</a></p></body></html>\n`,
);

fs.writeFileSync(
  path.join(promo, "README.md"),
  `# Promo posters (A4)

- \`poster.html\` — **EN + pt-PT + 中文** (one sheet)
- \`poster-pt.html\` — redirect to \`poster.html\`
- QRs: live Worker + China Pages mirror
- Wordmark / QR use \`?v=\` cache-bust (\`.cachebust\`)

## Print (fit one page)

1. Open \`poster.html\`
2. Print → Paper **A4** · Scale **100%** · Margins **None** · **Background graphics** On
3. Do not use “Fit to printable area” if margins are already None — sheet is exactly 210×297 mm

Rebuild: \`npm run build:promo-posters\`

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

console.info(`[build-promo-posters] OK v=${v} trilingual A4 → docs/promo + public/promo`);
