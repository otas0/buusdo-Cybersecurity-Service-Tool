"use client";

import { summarizeProbeTimeouts, type CheckHistoryEntry } from "./check-history";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** CSV of timeout-host summary including probe budget at last check. */
export function timeoutSummaryToCsv(history: CheckHistoryEntry[]): string {
  const rows = summarizeProbeTimeouts(history);
  const lines = [
    "domain,timeouts,checks,maxProbeMs,lastProbeMs,probeTimeoutMs,headFails,headSkips,probeBlocked"
  ];
  for (const row of rows) {
    lines.push(
      [
        row.domain,
        row.timeouts,
        row.checks,
        row.maxProbeMs ?? "",
        row.lastProbeMs ?? "",
        row.lastProbeTimeoutMs ?? "",
        row.headFails,
        row.headSkips,
        row.probeBlocked
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export type FullHistoryCsvFilter =
  | "all"
  | "timedOut"
  | "headFail"
  | "headSkipped"
  | "probeBlocked";

/** Full check history rows (domain only — never full URL). */
export function fullHistoryToCsv(
  history: CheckHistoryEntry[],
  filter: FullHistoryCsvFilter = "all"
): string {
  const rows =
    filter === "timedOut"
      ? history.filter((row) => row.timedOut)
      : filter === "headFail"
        ? history.filter((row) => row.probeHeadFailed)
        : filter === "headSkipped"
          ? history.filter((row) => row.headSkipped)
          : filter === "probeBlocked"
            ? history.filter((row) => row.probeBlocked)
            : history;
  const lines = [
    "at,domain,level,probeMs,timedOut,probeTimeoutMs,probeHeadFailed,headSkipped,probeBlocked"
  ];
  for (const row of rows) {
    lines.push(
      [
        row.at,
        row.domain,
        row.level,
        row.probeMs ?? "",
        row.timedOut ? "1" : "0",
        row.probeTimeoutMs ?? "",
        row.probeHeadFailed ? "1" : "0",
        row.headSkipped ? "1" : "0",
        row.probeBlocked ? "1" : "0"
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export function downloadTimeoutSummaryCsv(history: CheckHistoryEntry[], filename = "probe-timeouts.csv") {
  const csv = timeoutSummaryToCsv(history);
  if (csv.trim().split("\n").length <= 1) return { ok: false as const };
  downloadCsv(csv, filename);
  return { ok: true as const, filename };
}

export function downloadFullHistoryCsv(
  history: CheckHistoryEntry[],
  options: { filter?: FullHistoryCsvFilter; filename?: string } = {}
) {
  const filter = options.filter || "all";
  const filename =
    options.filename ||
    (filter === "timedOut"
      ? "check-history-timeouts.csv"
      : filter === "headFail"
        ? "check-history-headfails.csv"
        : filter === "headSkipped"
          ? "check-history-headskipped.csv"
          : filter === "probeBlocked"
            ? "check-history-probe-blocked.csv"
            : "check-history.csv");
  const csv = fullHistoryToCsv(history, filter);
  if (csv.trim().split("\n").length <= 1) return { ok: false as const };
  downloadCsv(csv, filename);
  return { ok: true as const, filename };
}