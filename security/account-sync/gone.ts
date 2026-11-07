/** Shared 410 response — Account sync product cancelled. */
export function accountSyncGoneResponse(request?: Request): Response {
  const origin = request?.headers.get("origin") || "*";
  return Response.json(
    {
      ok: false,
      error: "account-sync-cancelled",
      hint: "Use offline shield-lists-v1 export/import or Syncthing on shield-backup.json"
    },
    {
      status: 410,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        Vary: "Origin"
      }
    }
  );
}

export function accountSyncGoneOptions(request?: Request): Response {
  const origin = request?.headers.get("origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin"
    }
  });
}
