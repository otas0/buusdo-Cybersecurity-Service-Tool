/** @deprecated Account sync cancelled. */
import {
  accountSyncGoneOptions,
  accountSyncGoneResponse
} from "../../../../../security/account-sync/gone";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return accountSyncGoneOptions(request);
}

export function GET(request: Request) {
  return accountSyncGoneResponse(request);
}
