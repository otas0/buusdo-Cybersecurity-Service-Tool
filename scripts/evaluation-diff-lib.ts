/**
 * Shared helpers for evaluation artifact diffs (script + unit tests).
 */
import { evaluationScenarios } from "../evaluation/scenarios";

export type ScenarioRow = { id: string; passed?: boolean; name?: string };

const catalogNames = new Map(evaluationScenarios.map((row) => [row.id, row.name]));

/** Catalog name from evaluation/scenarios.ts when report rows omit `name`. */
export function catalogScenarioName(id: string): string {
  return catalogNames.get(id) || "";
}

export function resolveScenarioName(id: string, fromReport?: string): string {
  if (typeof fromReport === "string" && fromReport.trim()) return fromReport.trim();
  return catalogScenarioName(id);
}

export function loadFailedFromReport(report: { scenarios?: ScenarioRow[] }): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of report.scenarios || []) {
    if (row && row.passed === false && row.id) {
      map.set(row.id, resolveScenarioName(row.id, row.name));
    }
  }
  return map;
}

export function formatDiffCell(ids: string[], names: Map<string, string>): string {
  if (!ids.length) return "—";
  return ids
    .map((id) => {
      const name = names.get(id) || catalogScenarioName(id);
      return name ? `\`${id}\` — ${name}` : `\`${id}\``;
    })
    .join("<br>");
}