/**
 * Educational HTTP proxy on :8080
 * --------------------------------
 * - Inspects plain HTTP requests against the demo tracker/phishing lists.
 * - Blocks matches with HTTP 403 and pushes an event to the dashboard.
 * - HTTPS (CONNECT): tunnels without inspection.
 *
 * School-demo note: real HTTPS interception would need a local MITM CA
 * certificate installed on the device. We deliberately do NOT implement
 * MITM, certificate generation, or credential capture.
 */

const http = require("http");
const net = require("net");
const { URL } = require("url");
const { classifyUrl } = require("./threats");
const state = require("./state");

const PROXY_PORT = Number(process.env.PROXY_PORT || 8080);

/**
 * CONNECT 403 with the same Kind headers as plain-HTTP blocks (parity for user-block).
 * @param {{ write: Function, end: Function }} clientSocket
 * @param {{ kind: string, display?: string }} hostCheck
 */
function writeConnectRefuse(clientSocket, hostCheck) {
  const kind = hostCheck.kind || "phishing";
  clientSocket.write(
    "HTTP/1.1 403 Forbidden\r\n" +
      "Content-Type: text/plain\r\n" +
      "Connection: close\r\n" +
      "X-Preventive-Shield: blocked\r\n" +
      `X-Preventive-Shield-Kind: ${kind}\r\n` +
      "\r\n" +
      "Preventive Shield blocked this host. No TLS decryption; the hostname alone matched.\r\n"
  );
  clientSocket.end();
}

function blockResponse(clientRes, classification) {
  const body = [
    "Preventive Shield — request blocked",
    `kind: ${classification.kind}`,
    `target: ${classification.display}`,
    "",
    "The local proxy blocked a known tracker host or a phishing signal.",
    "No credentials were read or stored."
  ].join("\n");

  clientRes.writeHead(403, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "X-Preventive-Shield": "blocked",
    "X-Preventive-Shield-Kind": classification.kind
  });
  clientRes.end(body);
}

function handleHttpProxy(clientReq, clientRes) {
  // When used as an HTTP proxy, req.url is absolute (http://host/path).
  const targetUrl = clientReq.url || "";
  const classification = classifyUrl(targetUrl);

  if (classification.kind) {
    state.recordBlock({
      kind: classification.kind,
      source: "proxy-http",
      display: classification.display,
      reason: classification.reason
    });
    blockResponse(clientRes, classification);
    return;
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    clientRes.writeHead(400, { "Content-Type": "text/plain" });
    clientRes.end("Bad proxy request URL");
    return;
  }

  if (parsed.protocol !== "http:") {
    clientRes.writeHead(501, { "Content-Type": "text/plain" });
    clientRes.end(
      "This proxy only forwards plain HTTP. HTTPS uses CONNECT tunneling without inspection (no MITM)."
    );
    return;
  }

  const headers = { ...clientReq.headers, host: parsed.host };
  // Avoid hop-by-hop issues in a tiny demo proxy.
  delete headers["proxy-connection"];
  delete headers["connection"];

  const upstream = http.request(
    {
      protocol: "http:",
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: `${parsed.pathname}${parsed.search}`,
      method: clientReq.method,
      headers
    },
    (upRes) => {
      clientRes.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(clientRes);
    }
  );

  upstream.on("error", (err) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "Content-Type": "text/plain" });
    }
    clientRes.end(`Upstream error: ${err.message}`);
  });

  clientReq.pipe(upstream);
}

/**
 * HTTPS CONNECT — blind tunnel. We do not decrypt TLS.
 * Hostname-only refuse when classifyUrl marks phishing (curated lookalikes
 * or personal shield-lists-v1 blocks). Optional: if the CONNECT host alone matches a phishing host, we can
 * refuse the tunnel (host-only check, still no payload inspection).
 */
function handleConnect(req, clientSocket, head) {
  const [host, portStr] = String(req.url || "").split(":");
  const port = Number(portStr || 443);

  // Host-only educational block for obvious demo phishing hosts over HTTPS.
  const hostCheck = classifyUrl(`https://${host}/`);
  if (hostCheck.kind === "phishing" || hostCheck.kind === "user-block") {
    state.recordBlock({
      kind: hostCheck.kind,
      source: "proxy-connect",
      display: host,
      reason: hostCheck.reason
    });
    // Diagnostics: kind only — never log URL path or credentials.
    if (state.snapshot().privacyMode === "share") {
      console.info(`[desktop] CONNECT refuse kind=${hostCheck.kind}`);
    }
    writeConnectRefuse(clientSocket, hostCheck);
    return;
  }

  const serverSocket = net.connect(port, host, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head?.length) serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on("error", () => clientSocket.end());
  clientSocket.on("error", () => serverSocket.end());
}

function startProxy() {
  const server = http.createServer(handleHttpProxy);
  server.on("connect", handleConnect);

  server.listen(PROXY_PORT, "127.0.0.1", () => {
    console.log(`[desktop] HTTP proxy listening on http://127.0.0.1:${PROXY_PORT}`);
    console.log(
      "[desktop] HTTPS: CONNECT tunnel only (no MITM cert). HTTP URLs are checked against the tracker list and phishing signals."
    );
  });

  return server;
}

module.exports = { startProxy, PROXY_PORT, writeConnectRefuse, handleConnect, handleHttpProxy };