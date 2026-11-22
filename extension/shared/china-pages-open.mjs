/**
 * Open a China Pages URL from the extension popup.
 * When preferSameOrigin is true and a tab already on the China Pages origin
 * exists, update that tab instead of opening a new one.
 *
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} opts.origin — China Pages origin (e.g. https://otas0.github.io)
 * @param {boolean} [opts.preferSameOrigin]
 * @param {{ query: (q?: object) => Promise<Array<{id?: number, url?: string, windowId?: number}>>, update: (id: number, props: object) => Promise<unknown> }} [opts.tabs]
 * @param {{ update: (id: number, props: object) => Promise<unknown> }} [opts.windows]
 * @param {(url: string, target?: string, features?: string) => unknown} [opts.openBlank]
 * @returns {Promise<"same-origin" | "blank">}
 */
export async function openChinaPagesUrl({
  url,
  origin,
  preferSameOrigin = false,
  tabs,
  windows,
  openBlank = (u, t, f) => (typeof window !== "undefined" ? window.open(u, t, f) : undefined)
}) {
  if (preferSameOrigin && tabs?.query) {
    try {
      const list = await tabs.query({});
      const hit = list.find((tab) => typeof tab.url === "string" && tab.url.startsWith(origin));
      if (hit?.id != null) {
        await tabs.update(hit.id, { url, active: true });
        if (hit.windowId != null && windows?.update) {
          await windows.update(hit.windowId, { focused: true });
        }
        return "same-origin";
      }
    } catch {
      /* fall through */
    }
  }
  openBlank(url, "_blank", "noopener,noreferrer");
  return "blank";
}
