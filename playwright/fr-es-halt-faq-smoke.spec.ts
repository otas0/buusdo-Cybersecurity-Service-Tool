/**
 * FR/ES Halt evidence titles + FAQ question form (offline HTML fixture).
 *
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test playwright/fr-es-halt-faq-smoke.spec.ts
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const en = JSON.parse(readFileSync(path.join(root, "i18n/packs/_en.snapshot.json"), "utf8")) as Record<
  string,
  string
>;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

for (const id of ["fr", "es"] as const) {
  test(`${id} Halt evidence title + FAQ questions are native (not EN)`, async ({ page }) => {
    const pack = JSON.parse(readFileSync(path.join(root, "i18n/packs", `${id}.json`), "utf8")) as Record<
      string,
      string
    >;
    const knownTitle = pack.evidenceKnownThreatTitle;
    const faqWipe = pack.faqNoWipeTitle;
    const faqAv = pack.faqNoAvTitle;
    const faqCrowd = pack.faqNoCrowdTitle;
    const faqHeading = pack.faqCommonTitle || pack.faqParentsTitle;

    expect(knownTitle).toBeTruthy();
    expect(knownTitle).not.toEqual(en.evidenceKnownThreatTitle);
    expect(faqWipe).not.toEqual(en.faqNoWipeTitle);
    expect(faqAv).not.toEqual(en.faqNoAvTitle);
    expect(faqCrowd).not.toEqual(en.faqNoCrowdTitle);
    // Question form: packs should end with ? or ¿…? / contain interrogative markers
    expect(faqWipe).toMatch(/[?？]/);
    expect(faqAv).toMatch(/[?？]/);
    expect(faqCrowd).toMatch(/[?？]/);

    const html = `<!doctype html>
<html lang="${id}">
<body>
  <div data-testid="result-layout">
    <strong data-testid="evidence-known-threat-title">${escapeHtml(knownTitle)}</strong>
  </div>
  <section id="privacy-faq-common" data-testid="privacy-faq">
    <h2 data-testid="faq-common-title">${escapeHtml(faqHeading || "")}</h2>
    <h3 data-testid="faq-no-wipe-title">${escapeHtml(faqWipe)}</h3>
    <h3 data-testid="faq-no-av-title">${escapeHtml(faqAv)}</h3>
    <h3 data-testid="faq-no-crowd-title">${escapeHtml(faqCrowd)}</h3>
  </section>
</body>
</html>`;

    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };
    try {
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("evidence-known-threat-title")).toHaveText(knownTitle);
      await expect(page.getByTestId("faq-no-wipe-title")).toContainText("?");
      await expect(page.getByTestId("faq-no-av-title")).toContainText("?");
      await expect(page.getByTestId("faq-no-crowd-title")).toContainText("?");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
}
