"use client";

import { useState } from "react";
import { probeBudgetCopy } from "../shared/probe-budget-copy.mjs";
import type { Locale } from "../i18n/messages";

async function copyText(value: string): Promise<"ok" | "prompt" | "fail"> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return "ok";
    } catch {
      /* fall through */
    }
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (ok) return "ok";
  } catch {
    /* fall through */
  }
  try {
    window.prompt("Copy this value:", value);
    return "prompt";
  } catch {
    return "fail";
  }
}

export function CopyEnvLine({
  locale,
  envLine,
  className = "",
  label,
  copiedLabel
}: {
  locale: Locale;
  envLine: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}) {
  const copy = probeBudgetCopy(locale);
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");

  async function onCopy() {
    if (!envLine) return;
    const result = await copyText(envLine);
    setState(result === "fail" ? "fail" : "ok");
    window.setTimeout(() => setState("idle"), 2000);
  }

  const doneLabel = copiedLabel || copy.copied;

  return (
    <div className={`check-timing-copy ${className}`.trim()}>
      <code className="check-timing-env">{envLine}</code>
      <button type="button" className="text-button" onClick={() => void onCopy()}>
        {state === "ok" ? doneLabel : label || copy.copyLabel}
      </button>
      {state === "ok" && (
        <span className="copy-toast" role="status">
          {doneLabel}
        </span>
      )}
      {state === "fail" && (
        <span className="scope-note" role="status">
          {copy.copyFailed}
        </span>
      )}
    </div>
  );
}

export { copyText };