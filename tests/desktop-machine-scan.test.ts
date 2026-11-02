import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

async function loadClassify() {
  const mod = await import(pathToFileURL(join(process.cwd(), "shared/detect.mjs")).href);
  return mod.classifyUrl as (url: string) => { kind?: string | null; host?: string | null };
}

function loadScan() {
  delete require.cache[require.resolve("../desktop-app/src/machine-scan.js")];
  delete require.cache[require.resolve("../desktop-app/src/machine-paths.js")];
  return require("../desktop-app/src/machine-scan.js");
}

function loadBlock() {
  delete require.cache[require.resolve("../desktop-app/src/lists-store.js")];
  delete require.cache[require.resolve("../desktop-app/src/machine-block.js")];
  delete require.cache[require.resolve("../desktop-app/src/machine-paths.js")];
  return {
    lists: require("../desktop-app/src/lists-store.js"),
    block: require("../desktop-app/src/machine-block.js")
  };
}

test("extractHosts ignores bundle ids and keeps shield hosts", () => {
  const { extractHosts, isDisguisedName, isProtectedSystemPath, shouldAsk } = require(
    "../desktop-app/src/machine-paths.js"
  );
  const hosts = extractHosts(
    "com.apple.launchd https://paypal.secure-login.example/login google-analytics.com invoice.pdf.exe"
  );
  assert.equal(hosts.includes("paypal.secure-login.example"), true);
  assert.equal(hosts.includes("google-analytics.com"), true);
  assert.equal(hosts.some((host: string) => host.includes("apple")), false);
  assert.equal(isDisguisedName("invoice.pdf.exe"), true);
  assert.equal(isDisguisedName("report.pdf"), false);
  assert.equal(isProtectedSystemPath("/usr/bin/true"), true);
  assert.equal(
    shouldAsk({ status: "ready", actionableCount: 2, findingSetId: "abc" }, { findingSetId: "abc" }),
    false
  );
  assert.equal(shouldAsk({ status: "ready", actionableCount: 2, findingSetId: "abc" }, null), true);
  assert.equal(shouldAsk({ status: "scanning", actionableCount: 2, findingSetId: "abc" }, null), false);
});

test("machine scan flags disguise, dropped scripts, and startup items — not project source or shell rc", async () => {
  const root = mkdtempSync(join(tmpdir(), "shield-machine-"));
  const downloads = join(root, "Downloads");
  const project = join(root, "Desktop", "proj");
  const agents = join(root, "Library", "LaunchAgents");
  mkdirSync(downloads, { recursive: true });
  mkdirSync(project, { recursive: true });
  mkdirSync(agents, { recursive: true });
  writeFileSync(join(downloads, "invoice.pdf.exe"), "");
  writeFileSync(join(downloads, "pay.command"), "curl https://paypal.secure-login.example/login\n");
  writeFileSync(join(project, "package.json"), '{"name":"proj"}\n');
  writeFileSync(join(project, "app.js"), "const u = 'https://google-analytics.com/collect';\n");
  writeFileSync(join(root, ".zshrc"), "curl https://hotjar.com/x\n");
  writeFileSync(
    join(agents, "bad.plist"),
    `<?xml version="1.0"?><plist><string>/tmp/payload</string><string>https://paypal.secure-login.example/login</string></plist>`
  );

  try {
    const { scanMachine } = loadScan();
    const classify = await loadClassify();
    const result = await scanMachine({
      roots: [root],
      homeDir: root,
      includeSystem: false,
      productRoots: [join(root, "absent-product")],
      classify,
      isTrusted: () => false
    });

    assert.equal(result.status, "ready");
    const paths = result.findings.filter((item: { enforceable: string }) => item.enforceable === "quarantine").map((item: { path: string }) => item.path);
    assert.equal(paths.some((file: string) => file.endsWith("invoice.pdf.exe")), true);
    assert.equal(paths.some((file: string) => file.endsWith("pay.command")), true);
    assert.equal(paths.some((file: string) => file.endsWith("bad.plist")), true);
    assert.equal(paths.some((file: string) => file.endsWith("app.js")), false);
    assert.equal(paths.some((file: string) => file.endsWith(".zshrc")), false);
    const hosts = result.findings.filter((item: { enforceable: string }) => item.enforceable === "block-host").map((item: { host: string }) => item.host);
    assert.equal(hosts.includes("paypal.secure-login.example"), true);
    assert.equal(hosts.includes("hotjar.com"), true);
    assert.equal(hosts.includes("google-analytics.com"), false);
    assert.ok(result.actionableCount >= 4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("trusted hosts are not offered for blocking", async () => {
  const root = mkdtempSync(join(tmpdir(), "shield-machine-trust-"));
  writeFileSync(join(root, ".zshrc"), "curl https://hotjar.com/x\n");
  try {
    const { scanMachine } = loadScan();
    const classify = await loadClassify();
    const result = await scanMachine({
      roots: [root],
      homeDir: root,
      includeSystem: false,
      productRoots: [],
      classify,
      isTrusted: (host: string) => host === "hotjar.com"
    });
    const hosts = result.findings.map((item: { host: string | null }) => item.host);
    assert.equal(hosts.includes("hotjar.com"), false);
    assert.equal(result.trustedSkipped.includes("hotjar.com"), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("windows and linux system paths are report-only; user startup files can be quarantined", () => {
  const { planSystemTargets, mayQuarantinePath } = require("../desktop-app/src/machine-paths.js");
  const windows = planSystemTargets(
    [
      "Task To Run: C:\\Users\\me\\Downloads\\invoice.pdf.exe",
      "C:\\Users\\me\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\payload.bat",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run → C:\\Users\\me\\AppData\\Local\\Temp\\drop.exe",
      "schtasks /Create /TR C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      "C:\\Windows\\System32\\cmd.exe"
    ].join("\n"),
    { platform: "win32", homeDir: "C:\\Users\\me" }
  );
  const byPath = Object.fromEntries(windows.map((item: { path: string; action: string }) => [item.path.toLowerCase(), item.action]));
  assert.equal(byPath["c:\\users\\me\\downloads\\invoice.pdf.exe"], "quarantine");
  assert.equal(
    byPath["c:\\users\\me\\appdata\\roaming\\microsoft\\windows\\start menu\\programs\\startup\\payload.bat"],
    "quarantine"
  );
  assert.equal(byPath["c:\\users\\me\\appdata\\local\\temp\\drop.exe"], "quarantine");
  assert.equal(byPath["c:\\windows\\system32\\windowspowershell\\v1.0\\powershell.exe"], "report-only");
  assert.equal(byPath["c:\\windows\\system32\\cmd.exe"], "report-only");
  assert.equal(mayQuarantinePath("C:\\Windows\\System32\\cmd.exe", "C:\\Users\\me", "win32"), false);

  const linux = planSystemTargets(
    [
      "* * * * * /usr/bin/curl https://hotjar.com/x",
      "* * * * * /home/me/.config/autostart/bad.desktop",
      "* * * * * /etc/cron.d/sysjob",
      "@reboot /etc/init.d/malware"
    ].join("\n"),
    { platform: "linux", homeDir: "/home/me" }
  );
  const linuxByPath = Object.fromEntries(linux.map((item: { path: string; action: string }) => [item.path, item.action]));
  assert.equal(linuxByPath["/usr/bin/curl"], "report-only");
  assert.equal(linuxByPath["/etc/cron.d/sysjob"], "report-only");
  assert.equal(linuxByPath["/etc/init.d/malware"], "report-only");
  assert.equal(linuxByPath["/home/me/.config/autostart/bad.desktop"], "quarantine");
  assert.equal(mayQuarantinePath("/usr/bin/curl", "/home/me", "linux"), false);
  assert.equal(mayQuarantinePath("/etc/hosts", "/home/me", "linux"), false);
  assert.equal(mayQuarantinePath("/home/me/.config/autostart/bad.desktop", "/home/me", "linux"), true);
});

test("continue scan resumes past the file cap and names the directory in progress", async () => {
  const root = mkdtempSync(join(tmpdir(), "shield-machine-cap-"));
  for (let i = 0; i < 5; i += 1) writeFileSync(join(root, `note-${i}.txt`), "plain\n");
  try {
    const { createSession } = loadScan();
    const classify = await loadClassify();
    const session = createSession({
      roots: [root],
      homeDir: root,
      includeSystem: false,
      productRoots: [],
      classify,
      limits: { maxFiles: 2, maxDurationMs: 20000 }
    });
    const first = await session.run();
    assert.equal(first.status, "ready");
    assert.equal(first.coverage.capped, true);
    assert.equal(first.coverage.files, 2);
    assert.ok(String(first.coverage.currentDir || "").startsWith(root));
    const second = await session.continueScan();
    assert.ok(second.coverage.files > first.coverage.files);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("maximum block quarantines a user file, refuses system paths, and restore puts the file back", async () => {
  const root = mkdtempSync(join(tmpdir(), "shield-machine-block-"));
  const listsFile = join(root, "shield-backup.json");
  const decision = join(root, "machine-decision.json");
  const quarantine = join(root, "quarantine");
  const dropped = join(root, "invoice.pdf.exe");
  writeFileSync(dropped, "x");
  process.env.SHIELD_LISTS_PATH = listsFile;
  process.env.SHIELD_MACHINE_DECISION_PATH = decision;
  process.env.SHIELD_QUARANTINE_PATH = quarantine;
  const systemFile = process.platform === "win32" ? join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe") : "/usr/bin/true";

  try {
    const { block, lists } = loadBlock();
    const mod = await lists.loadMod();
    await lists.writeLists(mod.addBlocked(mod.emptyLists(), "keep.example", "user"));
    const result = await block.applyMaximum([
      {
        id: "drop1",
        enforceable: "quarantine",
        path: dropped,
        reason: "disguised-file",
        display: "invoice.pdf.exe"
      },
      {
        id: "sys1",
        enforceable: "quarantine",
        path: systemFile,
        reason: "disguised-file",
        display: "true"
      },
      {
        id: "host1",
        enforceable: "block-host",
        host: "paypal.secure-login.example",
        reason: "phishing",
        display: "paypal.secure-login.example"
      }
    ]);
    assert.equal(result.ok, true);
    assert.equal(existsSync(dropped), false);
    assert.equal(existsSync(systemFile), true);
    assert.equal(result.skipped.some((item: { reason: string }) => item.reason === "protected"), true);
    const saved = JSON.parse(readFileSync(listsFile, "utf8"));
    assert.equal(saved.blocked.some((item: { domain: string; reason?: string }) => item.domain === "paypal.secure-login.example" && item.reason === "machine-scan"), true);
    assert.equal(saved.blocked.some((item: { domain: string; reason?: string }) => item.domain === "keep.example" && item.reason === "user"), true);

    const restored = await block.restoreAll();
    assert.equal(restored.ok, true);
    assert.equal(readFileSync(dropped, "utf8"), "x");
    const after = JSON.parse(readFileSync(listsFile, "utf8"));
    assert.equal(after.blocked.some((item: { domain: string }) => item.domain === "paypal.secure-login.example"), false);
    assert.equal(after.blocked.some((item: { domain: string }) => item.domain === "keep.example"), true);
    assert.equal(existsSync(decision), false);

    writeFileSync(dropped, "x");
    const blocked = await block.applyMaximum([
      {
        id: "drop2",
        enforceable: "quarantine",
        path: dropped,
        reason: "disguised-file",
        display: "invoice.pdf.exe"
      }
    ]);
    assert.equal(blocked.ok, true);
    writeFileSync(dropped, "occupied");
    const failed = await block.restoreAll();
    assert.equal(failed.ok, false);
    const kept = block.listQuarantine();
    assert.equal(kept.length, 1);
    assert.equal(kept[0].error, "destination-exists");
    assert.equal(kept[0].from.endsWith("invoice.pdf.exe"), true);
  } finally {
    delete process.env.SHIELD_LISTS_PATH;
    delete process.env.SHIELD_MACHINE_DECISION_PATH;
    delete process.env.SHIELD_QUARANTINE_PATH;
    rmSync(root, { recursive: true, force: true });
  }
});