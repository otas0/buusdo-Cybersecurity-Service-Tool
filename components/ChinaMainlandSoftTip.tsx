/**
 * Former client CN→Pages redirect fallback.
 *
 * Product decision (2026-11-28): **disabled**. Language / timezone / geo
 * heuristics polluted JP and overseas zh users; mainland visitors usually cannot
 * load Workers HTML at all, so a client hop never helped them.
 * China notice stays Pages-only (store / QR / promo). No-op keeps import stable.
 */
export function ChinaMainlandSoftTip() {
  return null;
}
