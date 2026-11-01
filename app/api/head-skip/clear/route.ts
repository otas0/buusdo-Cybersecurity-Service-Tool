import { NextResponse } from "next/server";
import {
  clearHeadSkipCache,
  listHeadSkipEntries,
  serializeHeadSkipEntry
} from "../../../../security/probe-head-skip";

export const runtime = "nodejs";

/** Clear persisted HEAD-skip domain cache (server memory + runtime JSON). */
export async function POST() {
  clearHeadSkipCache();
  const headSkipEntries = listHeadSkipEntries();
  return NextResponse.json({
    ok: true,
    headSkipDomains: headSkipEntries.map((row) => row.domain),
    headSkipEntries: headSkipEntries.map(serializeHeadSkipEntry)
  });
}