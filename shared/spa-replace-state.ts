/**
 * history.replaceState does not fire hashchange. When only the hash changes
 * (same pathname+search), synthesize HashChangeEvent so SPA listeners stay in sync.
 *
 * Happy path (empty hash → "#…"): `/en/settings` + replaceState(`…#settings-desktop`) fires
 * hashchange — `tests/spa-replace-state-hashchange.test.ts`
 * ("synthetic hashchange when search stays empty and hash flips from \"\" → \"#…\"").
 *
 * Pathname-stable-only: synthesize only when pathname+search are unchanged and the hash flips.
 * Does **not** synthesize when search changes (even with a hash flip).
 * @see tests/spa-replace-state-hashchange.test.ts — "no synthetic hashchange when hash and search both change (pathname-stable only)"
 * Playwright SPA no-reload: assert document `load` only (vinext soft nav may emit framenavigated) —
 * @see playwright/helpers/spa-settings-nav.ts
 */

/** Playwright must listen to this event (not `framenavigated`) for SPA no-reload asserts. */
export const SPA_NO_RELOAD_EVENT = "load" as const;

export function replaceStateMaybeHashchange(
  path: string,
  win: Pick<Window, "history" | "location" | "dispatchEvent"> = typeof window !== "undefined"
    ? window
    : (undefined as unknown as Window)
): boolean {
  if (!win?.history || !win.location) return false;
  const beforePath = `${win.location.pathname}${win.location.search}`;
  const beforeSearch = win.location.search;
  const beforeHash = win.location.hash;
  win.history.replaceState(null, "", path);
  const afterPath = `${win.location.pathname}${win.location.search}`;
  const afterSearch = win.location.search;
  const afterHash = win.location.hash;
  // Pathname+search unchanged and hash flipped (including "" → "#…", search stays empty).
  const pathStable = beforePath === afterPath;
  const searchStableEmpty = beforeSearch === "" && afterSearch === "";
  const hashFlipped = beforeHash !== afterHash;
  if (pathStable && hashFlipped && (searchStableEmpty || beforeSearch === afterSearch)) {
    const Ev =
      typeof HashChangeEvent !== "undefined"
        ? HashChangeEvent
        : typeof Event !== "undefined"
          ? Event
          : null;
    if (Ev) win.dispatchEvent(new Ev("hashchange"));
    return true;
  }
  return false;
}