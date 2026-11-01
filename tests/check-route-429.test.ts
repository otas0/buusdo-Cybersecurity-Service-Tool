import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OPTIONS, POST } from "../app/api/check/route";
import { clearRateLimitKey } from "../security/rate-limit";

const CLIENT_IP = "203.0.113.50";
const RATE_KEY = `check:${CLIENT_IP}`;

test("timing-schema-invalid path documents diagnostic.ambiguousProbeStatus for mid-migration", () => {
  const src = readFileSync(join(process.cwd(), "app/api/check/route.ts"), "utf8");
  assert.match(src, /timing-schema-invalid/);
  assert.match(src, /diagnostic:\s*\{/);
  assert.match(src, /ambiguousProbeStatus/);
  assert.match(src, /CheckTiming 1\.5/);
  assert.match(src, /diagnostic\.ambiguousProbeStatus=/);
  assert.match(src, /Fixed strings? only — never URL/);
});

test("extension README links Operators FAQ probe-blocked vs phishing", () => {
  const readme = readFileSync(join(process.cwd(), "extension/README.md"), "utf8");
  assert.match(readme, /operators-faq--probe-blocked-vs-phishing/);
  assert.match(readme, /API_CHECK_CONTRACT\.md/);
});

test("OPTIONS /api/check exposes Retry-After for CORS preflight", async () => {
  const response = await OPTIONS(
    new Request("http://127.0.0.1/api/check", {
      method: "OPTIONS",
      headers: {
        Origin: "http://127.0.0.1:3001",
        "Access-Control-Request-Method": "POST"
      }
    })
  );
  assert.equal(response.status, 204);
  const expose = response.headers.get("Access-Control-Expose-Headers") || "";
  assert.match(expose, /Retry-After/i);
});

test("personalListBlocked soft notice is a fixed string (no URL interpolation)", () => {
  const src = readFileSync(join(process.cwd(), "app/api/check/route.ts"), "utf8");
  assert.match(src, /console\.info\("\[api\/check\] personalListBlocked hint accepted"\)/);
  assert.match(src, /CHECK_PERSONAL_HINT_LOG/);
  // Must not interpolate request URL into the soft notice.
  assert.equal(/console\.info\([^)]*url/i.test(src), false);
  assert.equal(/console\.info\(`[^`]*\$\{/.test(src), false);
});

test("POST /api/check rejects non-boolean personalListBlocked with 400", async () => {
  clearRateLimitKey(RATE_KEY);
  const response = await POST(
    new Request("http://127.0.0.1/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": CLIENT_IP
      },
      body: JSON.stringify({ url: "https://ordinary-garden.test/", personalListBlocked: "yes" })
    })
  );
  assert.equal(response.status, 400);
  const body = (await response.json()) as { ok?: boolean; error?: string };
  assert.equal(body.ok, false);
  assert.equal(body.error, "personalListBlocked-must-be-boolean");
});

test("POST /api/check returns Retry-After + expose header on 429", async () => {
  const prevLimit = process.env.CHECK_RATE_LIMIT;
  const prevWindow = process.env.CHECK_RATE_WINDOW_MS;
  process.env.CHECK_RATE_LIMIT = "1";
  process.env.CHECK_RATE_WINDOW_MS = "60000";
  clearRateLimitKey(RATE_KEY);

  try {
    const makeReq = () =>
      new Request("http://127.0.0.1/api/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://127.0.0.1:3001",
          "X-Forwarded-For": CLIENT_IP
        },
        body: JSON.stringify({ url: "https://ordinary-garden.test/" })
      });

    const first = await POST(makeReq());
    assert.notEqual(first.status, 429);

    const limited = await POST(makeReq());
    assert.equal(limited.status, 429);
    const retryAfter = limited.headers.get("Retry-After");
    assert.ok(retryAfter);
    assert.ok(Number(retryAfter) >= 1);
    const expose = limited.headers.get("Access-Control-Expose-Headers") || "";
    assert.match(expose, /Retry-After/i);
    const body = (await limited.json()) as { ok?: boolean; error?: string; retryAfterSec?: number };
    assert.equal(body.ok, false);
    assert.equal(body.error, "rate-limited");
    assert.equal(body.retryAfterSec, Number(retryAfter));
  } finally {
    clearRateLimitKey(RATE_KEY);
    if (prevLimit === undefined) delete process.env.CHECK_RATE_LIMIT;
    else process.env.CHECK_RATE_LIMIT = prevLimit;
    if (prevWindow === undefined) delete process.env.CHECK_RATE_WINDOW_MS;
    else process.env.CHECK_RATE_WINDOW_MS = prevWindow;
  }
});