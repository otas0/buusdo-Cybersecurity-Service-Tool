/**
 * Classic helper for popup/dashboard after qrcode-browser.js is loaded.
 * Keep in sync with qr-draw.mjs.
 */
(function (global) {
  var QR_HOST_LIMIT = 40;

  function listsFitQrCanvas(lists) {
    var n = ((lists && lists.blocked && lists.blocked.length) || 0) +
      ((lists && lists.trusted && lists.trusted.length) || 0);
    return n > 0 && n <= QR_HOST_LIMIT;
  }

  function drawQrToCanvas(canvas, text, opts, done) {
    var QrLib = global.QrLib;
    var width = (opts && opts.width) || 160;
    if (!QrLib || !QrLib.toCanvas || !canvas) {
      if (done) done(new Error("qr-unavailable"));
      return;
    }
    QrLib.toCanvas(
      canvas,
      text,
      { width: width, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a0a0a", light: "#f4f4f0" } },
      function (err) {
        if (done) done(err || null);
      }
    );
  }

  global.ShieldQr = {
    QR_HOST_LIMIT: QR_HOST_LIMIT,
    listsFitQrCanvas: listsFitQrCanvas,
    drawQrToCanvas: drawQrToCanvas
  };
})(typeof globalThis !== "undefined" ? globalThis : self);