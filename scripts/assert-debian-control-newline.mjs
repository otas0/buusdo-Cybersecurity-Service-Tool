/**
 * dpkg-deb requires DEBIAN/control to end with a newline (EOF during Homepage otherwise).
 *
 *   node scripts/assert-debian-control-newline.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const files = [
  "desktop-app/packaging/linux/debian/DEBIAN/control",
  "desktop-app/packaging/linux/debian/DEBIAN/control.arm64"
];

let failed = false;
for (const rel of files) {
  const abs = path.resolve(rel);
  const buf = readFileSync(abs);
  if (buf.length === 0 || buf[buf.length - 1] !== 0x0a) {
    console.error(`FAIL: ${rel} must end with a trailing newline (dpkg-deb Homepage EOF)`);
    failed = true;
  } else {
    console.log(`ok trailing newline: ${rel}`);
  }
}
if (failed) process.exit(1);
console.log("assert-debian-control-newline ok");
