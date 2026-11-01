"use client";

/** Maps the risk engine onto one status word: Clear, Hold, or Halt. */
export function levelToLight(level: string): "safe" | "caution" | "danger" {
  if (level === "LOW_EVIDENCE") return "safe";
  if (level === "HIGH" || level === "CRITICAL") return "danger";
  return "caution";
}

export function TrafficLights({
  level,
  standby,
  safe,
  caution,
  danger,
}: {
  level: "idle" | "safe" | "caution" | "danger";
  standby: string;
  safe: string;
  caution: string;
  danger: string;
}) {
  const word = level === "safe" ? safe : level === "caution" ? caution : level === "danger" ? danger : standby;
  return (
    <p className={`readout is-${level}`} data-level={level} role="status">
      <span className="mark" aria-hidden="true" />
      <span className="word">{word}</span>
    </p>
  );
}