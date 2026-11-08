/**
 * Promo A4 PDF floors — size + page count after export:promo-poster-pdf.
 *
 *   npm run assert:promo-poster-pdf-floor
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  path.join(root, "docs/promo/poster.pdf"),
  path.join(root, "public/promo/poster.pdf"),
];

/** Minimum bytes for a real A4 print PDF with wordmark + QRs (not an empty stub). */
const MIN_BYTES = 80_000;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`[assert-promo-poster-pdf-floor] missing ${path.relative(root, file)}`);
    process.exit(1);
  }
  const buf = fs.readFileSync(file);
  if (buf.length < MIN_BYTES) {
    console.error(
      `[assert-promo-poster-pdf-floor] FAIL ${path.relative(root, file)} size=${buf.length} < ${MIN_BYTES}`,
    );
    process.exit(1);
  }
  const head = buf.subarray(0, 5).toString("latin1");
  if (head !== "%PDF-") {
    console.error(`[assert-promo-poster-pdf-floor] FAIL ${path.relative(root, file)} not a PDF`);
    process.exit(1);
  }
  const latin = buf.toString("latin1");
  // Count page objects (exclude /Pages tree node).
  const pages = (latin.match(/\/Type\s*\/Page(?!\s*s)/g) || []).length;
  if (pages < 1) {
    console.error(
      `[assert-promo-poster-pdf-floor] FAIL ${path.relative(root, file)} page count=${pages}`,
    );
    process.exit(1);
  }
  console.info(
    `[assert-promo-poster-pdf-floor] OK ${path.relative(root, file)} bytes=${buf.length} pages≈${pages}`,
  );
}
