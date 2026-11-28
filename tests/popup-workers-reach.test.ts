/**
 * Mock-fetch unit tests for popup Workers reach helpers.
 *
 *   npx tsx --test tests/popup-workers-reach.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyUnreachableUi,
  prefersChinaNoticePrimary,
  resolveChinaNoticePrimary,
  probeWorkersHealth,
  formatUnreachableWithProbeMs,
  CHINA_NOTICE_URL,
  HEALTH_PROBE_MS
} from "../extension/popup/workers-reach.mjs";

test("HEALTH_PROBE_MS is ≥8s to reduce JP false unreachable", () => {
  assert.ok(HEALTH_PROBE_MS >= 8000);
});

test("prefersChinaNoticePrimary only for zh UI", () => {
  assert.equal(prefersChinaNoticePrimary("zh-Hans"), true);
  assert.equal(prefersChinaNoticePrimary("zh-Hant"), true);
  assert.equal(prefersChinaNoticePrimary("ja"), false);
  assert.equal(prefersChinaNoticePrimary("en"), false);
});

test("resolveChinaNoticePrimary: non-zh never primary; zh needs failStreak≥2", () => {
  assert.equal(resolveChinaNoticePrimary({ lang: "ja", failStreak: 99 }), false);
  assert.equal(resolveChinaNoticePrimary({ lang: "en", failStreak: 5 }), false);
  assert.equal(resolveChinaNoticePrimary({ lang: "zh-Hans", failStreak: 1 }), false);
  assert.equal(resolveChinaNoticePrimary({ lang: "zh-Hans", failStreak: 2 }), true);
});

test("probeWorkersHealth returns unreachable false when health ok", async () => {
  const probe = await probeWorkersHealth({
    base: "https://example.test",
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({ ok: true, service: "buusdocst" })
      }) as Response
  });
  assert.equal(probe.unreachable, false);
  assert.equal(probe.timedOut, false);
});

test("probeWorkersHealth returns unreachable true on timeout/abort", async () => {
  const probe = await probeWorkersHealth({
    base: "https://example.test",
    timeoutMs: 20,
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      })
  });
  assert.equal(probe.unreachable, true);
  assert.equal(probe.timedOut, true);
  assert.ok(probe.ms >= 15);
});

test("probeWorkersHealth returns unreachable true when service mismatch", async () => {
  const probe = await probeWorkersHealth({
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({ ok: true, service: "other" })
      }) as Response
  });
  assert.equal(probe.unreachable, true);
});

test("formatUnreachableWithProbeMs appends timing", () => {
  assert.match(
    formatUnreachableWithProbeMs("down", { ms: 8001, timedOut: true }),
    /\[8001ms \(hit timeout\)\]/
  );
});

test("applyUnreachableUi: non-zh puts Workers primary, China ghost", () => {
  const manage = {
    hidden: false,
    href: "https://buusdocst.mtsu.workers.dev/en/lists-offline",
    removeAttribute(name: string) {
      if (name === "href") this.href = "";
    }
  } as HTMLAnchorElement & { href: string };
  const manageWrap = { hidden: false } as HTMLElement;
  const box = { hidden: true } as HTMLElement;
  const makeCta = () =>
    ({
      href: "",
      textContent: "",
      hidden: false,
      classList: {
        _s: new Set<string>(),
        add(c: string) {
          this._s.add(c);
        },
        remove(...cs: string[]) {
          for (const c of cs) this._s.delete(c);
        }
      }
    }) as unknown as HTMLAnchorElement;
  const chinaCta = makeCta();
  const workersCta = makeCta();
  const manageHint = { hidden: false, textContent: "" } as HTMLElement;

  const down = applyUnreachableUi(
    { box, manage, manageWrap, manageHint, chinaCta, workersCta },
    true,
    {
      chinaPrimary: false,
      chinaLabel: "Mainland notice",
      workersLabel: "Open website",
      hintWhenDown: "down"
    }
  );
  assert.equal(down.manageHidden, true);
  assert.equal(down.chinaPrimary, false);
  assert.equal(chinaCta.href, CHINA_NOTICE_URL);
  assert.ok((chinaCta.classList as unknown as { _s: Set<string> })._s.has("ghost-button"));
  assert.ok((workersCta.classList as unknown as { _s: Set<string> })._s.has("primary-button"));
});

test("applyUnreachableUi: zh-Hans puts China notice primary", () => {
  const makeCta = () =>
    ({
      href: "",
      textContent: "",
      hidden: false,
      classList: {
        _s: new Set<string>(),
        add(c: string) {
          this._s.add(c);
        },
        remove(...cs: string[]) {
          for (const c of cs) this._s.delete(c);
        }
      }
    }) as unknown as HTMLAnchorElement;
  const chinaCta = makeCta();
  const workersCta = makeCta();
  const r = applyUnreachableUi(
    {
      box: { hidden: true } as HTMLElement,
      chinaCta,
      workersCta
    },
    true,
    { chinaPrimary: true }
  );
  assert.equal(r.chinaPrimary, true);
  assert.ok((chinaCta.classList as unknown as { _s: Set<string> })._s.has("primary-button"));
  assert.ok((workersCta.classList as unknown as { _s: Set<string> })._s.has("ghost-button"));
});
