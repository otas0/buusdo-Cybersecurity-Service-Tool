/**
 * Mock-fetch unit tests for popup Workers reach helpers.
 *
 *   npx tsx --test tests/popup-workers-reach.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyUnreachableUi,
  probeWorkersHealth,
  CHINA_NOTICE_URL
} from "../extension/popup/workers-reach.mjs";

test("probeWorkersHealth returns false when health ok", async () => {
  const unreachable = await probeWorkersHealth({
    base: "https://example.test",
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({ ok: true, service: "buusdocst" })
      }) as Response
  });
  assert.equal(unreachable, false);
});

test("probeWorkersHealth returns true on timeout/abort", async () => {
  const unreachable = await probeWorkersHealth({
    base: "https://example.test",
    timeoutMs: 20,
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      })
  });
  assert.equal(unreachable, true);
});

test("probeWorkersHealth returns true when service mismatch", async () => {
  const unreachable = await probeWorkersHealth({
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({ ok: true, service: "other" })
      }) as Response
  });
  assert.equal(unreachable, true);
});

test("applyUnreachableUi hides manage when down and restores when up", () => {
  const manage = {
    hidden: false,
    href: "https://buusdocst.mtsu.workers.dev/en/lists-offline",
    removeAttribute(name: string) {
      if (name === "href") this.href = "";
    }
  } as HTMLAnchorElement & { href: string };
  const manageWrap = { hidden: false } as HTMLElement;
  const box = { hidden: true } as HTMLElement;
  const cta = { href: "", textContent: "" } as HTMLAnchorElement;
  const manageHint = { hidden: false, textContent: "" } as HTMLElement;

  const down = applyUnreachableUi(
    { box, manage, manageWrap, manageHint, cta },
    true,
    { hintWhenDown: "down", ctaLabel: "Open notice" }
  );
  assert.equal(down.manageHidden, true);
  assert.equal(manage.hidden, true);
  assert.equal(manageWrap.hidden, true);
  assert.equal(box.hidden, false);
  assert.equal(cta.href, CHINA_NOTICE_URL);
  assert.match(CHINA_NOTICE_URL, /utm_source=extension/);

  const up = applyUnreachableUi({ box, manage, manageWrap, manageHint, cta }, false);
  assert.equal(up.manageHidden, false);
  assert.equal(manage.hidden, false);
  assert.equal(manageWrap.hidden, false);
  assert.equal(box.hidden, true);
});
