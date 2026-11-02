/** Quit grace so SSE `bye` can flush before sockets close. */

function quitGraceMs() {
  const raw = process.env.SHIELD_QUIT_GRACE_MS;
  if (raw == null || raw === "") return 200;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 200;
  return Math.min(Math.floor(n), 10_000);
}

module.exports = { quitGraceMs };