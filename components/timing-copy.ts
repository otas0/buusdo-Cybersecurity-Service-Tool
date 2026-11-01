import type { CheckTiming } from "../security/analyse";

export type TimingLabelBag = {
  timingHeadFail: string;
  timingHeadSkipped: string;
  timingAmbiguousProbe: string;
  timingYes: string;
  timingNo: string;
};

/** Shared EN / pt-PT keys for progress + result timing copy — use everywhere. */
export function timingLabels(t: {
  timingHeadFail?: string;
  timingHeadSkipped?: string;
  timingAmbiguousProbe?: string;
  timingYes?: string;
  timingNo?: string;
}): TimingLabelBag {
  return {
    timingHeadFail: t.timingHeadFail || "headFail",
    timingHeadSkipped: t.timingHeadSkipped || "headSkipped",
    timingAmbiguousProbe: t.timingAmbiguousProbe || "ambiguousProbeStatus",
    timingYes: t.timingYes || "yes",
    timingNo: t.timingNo || "no"
  };
}

/** Shared timing summary line (progress + result copy) — EN / pt-PT via message bag. */
export function formatTimingSummaryLine(timing: CheckTiming, labels: TimingLabelBag): string {
  const yn = (v: boolean) => (v ? labels.timingYes : labels.timingNo);
  return [
    `parse ${timing.parseMs}ms`,
    `threat ${timing.threatMs}ms`,
    `probe ${timing.probeMs ?? "—"}ms`,
    `risk ${timing.riskMs}ms`,
    `total ${timing.totalMs}ms`,
    `budget ${timing.probeTimeoutMs}ms`,
    `${labels.timingHeadFail} ${yn(timing.probeHeadFailed)}`,
    `${labels.timingHeadSkipped} ${yn(timing.headSkipped)}`,
    `${labels.timingAmbiguousProbe} ${yn(Boolean(timing.ambiguousProbeStatus))}`
  ].join(" · ");
}

export function formatTimingHeadSkippedNote(
  timing: CheckTiming,
  labels: Pick<TimingLabelBag, "timingHeadSkipped" | "timingYes" | "timingNo">
): string {
  return `${labels.timingHeadSkipped} ${timing.headSkipped ? labels.timingYes : labels.timingNo}`;
}

export type TimingFlagChip = {
  id: "probeHeadFailed" | "headSkipped" | "ambiguousProbeStatus";
  label: string;
  on: boolean;
  text: string;
};

/** One-line details chips: headFail · headSkipped · ambiguousProbeStatus. */
export function formatTimingFlagChips(timing: CheckTiming, labels: TimingLabelBag): TimingFlagChip[] {
  const yn = (v: boolean) => (v ? labels.timingYes : labels.timingNo);
  return [
    {
      id: "probeHeadFailed",
      label: labels.timingHeadFail,
      on: Boolean(timing.probeHeadFailed),
      text: `${labels.timingHeadFail} ${yn(Boolean(timing.probeHeadFailed))}`
    },
    {
      id: "headSkipped",
      label: labels.timingHeadSkipped,
      on: Boolean(timing.headSkipped),
      text: `${labels.timingHeadSkipped} ${yn(Boolean(timing.headSkipped))}`
    },
    {
      id: "ambiguousProbeStatus",
      label: labels.timingAmbiguousProbe,
      on: Boolean(timing.ambiguousProbeStatus),
      text: `${labels.timingAmbiguousProbe} ${yn(Boolean(timing.ambiguousProbeStatus))}`
    }
  ];
}