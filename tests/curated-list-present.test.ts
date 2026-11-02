import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCuratedListPresent, OwnThreatIntelProvider } from "../security/threat-intel";

describe("curated list Workers bundle", () => {
  it("isCuratedListPresent is true from static JSON import", () => {
    assert.equal(isCuratedListPresent(), true);
  });

  it("OwnThreatIntelProvider sees curated hosts without fs", async () => {
    const own = new OwnThreatIntelProvider();
    // Any known curated host from security/data/curated-threats.json — pick via first key.
    const curatedMod = await import("../security/data/curated-threats.json", {
      with: { type: "json" }
    });
    const curated = (curatedMod as { default?: { hosts?: Record<string, unknown> } }).default ??
      (curatedMod as { hosts?: Record<string, unknown> });
    const hosts = Object.keys(curated.hosts || {});
    assert.ok(hosts.length > 0, "curated-threats.json must list hosts");
    const result = await own.checkDomain(hosts[0]!);
    assert.match(result.state, /^KNOWN_/);
  });
});