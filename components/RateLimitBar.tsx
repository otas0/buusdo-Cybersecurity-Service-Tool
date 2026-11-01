"use client";

import { useEffect, useRef, useState } from "react";

import {
  createAnnounceRefs,
  crossedFiveSecBoundary,
  resetAnnounceRefs,
  shouldAnnounceRateLimitTick
} from "./rate-limit-announce";

function formatTick(sec: number, tickTemplate: string, tickTemplateOne: string): string {
  if (sec === 1) return tickTemplateOne;
  return tickTemplate.replace("{sec}", String(sec));
}

function announceReasonFor(
  prev: number | null,
  sec: number
): "first" | "end" | "boundary" | "cross" | "" {
  if (prev == null) return "first";
  if (sec <= 1) return "end";
  if (sec % 5 === 0) return "boundary";
  if (crossedFiveSecBoundary(prev, sec)) return "cross";
  return "";
}

export function RateLimitBar({
  sec,
  total,
  label,
  tickTemplate,
  tickTemplateOne
}: {
  sec: number;
  total: number;
  label: string;
  /** i18n tick string with `{sec}` — announced on start, every 5s, and near end. */
  tickTemplate: string;
  tickTemplateOne: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((sec / total) * 100)) : 0;
  const valueText = formatTick(sec, tickTemplate, tickTemplateOne);
  const [liveText, setLiveText] = useState(valueText);
  const [announceReason, setAnnounceReason] = useState<"first" | "end" | "boundary" | "cross" | "">(
    ""
  );
  /** When reason is cross (skipped tick), keep aria-valuetext locked to the announced live text. */
  const [crossValueText, setCrossValueText] = useState<string | null>(null);
  const announceRefs = useRef(createAnnounceRefs()).current;

  useEffect(() => {
    return () => {
      resetAnnounceRefs(announceRefs);
    };
  }, [announceRefs]);

  useEffect(() => {
    if (
      !shouldAnnounceRateLimitTick(
        announceRefs.lastAnnouncedSec.current,
        sec,
        announceRefs.lastTotal.current,
        total
      )
    ) {
      return;
    }
    const prev = announceRefs.lastAnnouncedSec.current;
    const reason = announceReasonFor(prev, sec);
    const tick = formatTick(sec, tickTemplate, tickTemplateOne);
    setAnnounceReason(reason);
    announceRefs.lastAnnouncedSec.current = sec;
    announceRefs.lastTotal.current = total;
    setLiveText(tick);
    // Sync aria-valuetext with live region when a 5s boundary was skipped mid-wait.
    setCrossValueText(reason === "cross" ? tick : null);
  }, [sec, total, tickTemplate, tickTemplateOne, announceRefs]);

  const ariaValueText = crossValueText ?? valueText;

  return (
    <div
      className="rate-limit-bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={sec}
      aria-valuemin={0}
      aria-valuemax={total > 0 ? total : sec}
      aria-valuetext={ariaValueText}
      data-valuetext-synced={announceReason === "cross" ? "cross" : undefined}
    >
      <div className="rate-limit-bar-track">
        <div className="rate-limit-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="rate-limit-bar-label">{label}</p>
      <p
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="rate-limit-live"
        data-announce-reason={announceReason || undefined}
      >
        {liveText}
      </p>
    </div>
  );
}