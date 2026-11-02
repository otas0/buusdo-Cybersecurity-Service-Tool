/**
 * Linux ~/.config/autostart + user crontab report-only sampling.
 * Fixtures always run; live paths only when platform is linux.
 *
 *   npm run sample:desktop-linux-autostart
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { planSystemTargets, mayQuarantinePath } = require("../desktop-app/src/machine-paths.js");

const home = process.platform === "linux" ? os.homedir() : "/home/sample";
const text = [
  "* * * * * /usr/bin/curl https://hotjar.com/x",
  `* * * * * ${home}/.config/autostart/bad.desktop`,
  "* * * * * /etc/cron.d/sysjob",
  "@reboot /etc/init.d/malware"
].join("\n");

const planned = planSystemTargets(text, { platform: "linux", homeDir: home });
const byPath = Object.fromEntries(planned.map((item) => [item.path, item.action]));
assert.equal(byPath["/usr/bin/curl"], "report-only");
assert.equal(byPath["/etc/cron.d/sysjob"], "report-only");
assert.equal(byPath["/etc/init.d/malware"], "report-only");
assert.equal(byPath[`${home}/.config/autostart/bad.desktop`], "quarantine");
assert.equal(mayQuarantinePath("/usr/bin/true", home, "linux"), false);
assert.equal(mayQuarantinePath("/etc/hosts", home, "linux"), false);

if (process.platform === "linux") {
  const autostart = path.join(home, ".config", "autostart");
  console.log(`live autostart: ${autostart} exists=${existsSync(autostart)}`);
  if (existsSync(autostart)) {
    for (const name of readdirSync(autostart).slice(0, 20)) {
      const full = path.join(autostart, name);
      console.log(`  ${name} → ${mayQuarantinePath(full, home, "linux") ? "quarantine" : "report-only"}`);
    }
  }
  try {
    const cron = readFileSync("/etc/crontab", "utf8");
    const etcPlanned = planSystemTargets(cron, { platform: "linux", homeDir: home });
    for (const item of etcPlanned) {
      assert.equal(item.action, "report-only", item.path);
    }
    console.log(` /etc/crontab paths report-only: ${etcPlanned.length}`);
  } catch {
    console.log(" /etc/crontab not readable (ok)");
  }
}

console.log(`linux autostart sample ok (${planned.length} planned paths)`);