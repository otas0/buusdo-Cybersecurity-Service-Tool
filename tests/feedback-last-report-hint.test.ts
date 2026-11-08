import assert from "node:assert/strict";
import test from "node:test";
import {
  FEEDBACK_LAST_REPORT_KEY,
  clearReportDraftHint,
  hadReportDraftHint
} from "../components/feedback-drafts";

test("hadReportDraftHint reads session flag", () => {
  const store = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0
  } as Storage;

  assert.equal(hadReportDraftHint(), false);
  sessionStorage.setItem(FEEDBACK_LAST_REPORT_KEY, "1");
  assert.equal(hadReportDraftHint(), true);
  clearReportDraftHint();
  assert.equal(hadReportDraftHint(), false);
});
