/**
 * Shared bare-:focus detection for dashboard / ops / index HTML gates + unit fixture.
 */

export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function extractStyleBlocks(html) {
  const blocks = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    blocks.push(m[1]);
  }
  return blocks.join("\n");
}

/** Return snippets for bare `:focus` only (`:focus-visible` / `:focus-within` allowed). */
export function findBareFocus(css, label = "css") {
  const bare = [];
  const cleaned = stripComments(css);
  for (const match of cleaned.matchAll(/:focus(?:-visible|-within)?/g)) {
    if (match[0] !== ":focus") continue;
    const start = Math.max(0, match.index - 40);
    const snippet = cleaned.slice(start, match.index + match[0].length + 20).replace(/\s+/g, " ");
    bare.push(`${label}: …${snippet}…`);
  }
  return bare;
}