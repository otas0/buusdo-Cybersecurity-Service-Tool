/**
 * Draw shield-lists compact payload onto a canvas (no CDN).
 * Expects globalThis.QrLib from qrcode-browser.js (vendored qrcode@1.5.4).
 */

/** Max hosts for on-canvas QR (matches compactPayloadForQr default). */
export const QR_HOST_LIMIT = 40;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 * @param {{ width?: number }} [opts]
 * @returns {Promise<boolean>}
 */
export async function drawQrToCanvas(canvas, text, opts = {}) {
  const QrLib = globalThis.QrLib;
  if (!QrLib?.toCanvas || !canvas) return false;
  const width = opts.width || 160;
  await new Promise((resolve, reject) => {
    QrLib.toCanvas(
      canvas,
      text,
      { width, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a0a0a", light: "#f4f4f0" } },
      (err) => (err ? reject(err) : resolve())
    );
  });
  return true;
}

/**
 * @param {{ blocked?: unknown[]; trusted?: unknown[] }} lists
 */
export function listsFitQrCanvas(lists) {
  const n = (lists?.blocked?.length || 0) + (lists?.trusted?.length || 0);
  return n > 0 && n <= QR_HOST_LIMIT;
}