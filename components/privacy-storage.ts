"use client";

import { BLOCK_KEY, TRUST_KEY } from "../security/storage";
import { getPrivacyMode, type PrivacyMode } from "./report-analysis";

/**
 * Website persists check history / feedback drafts only.
 * Personal block/trust lists live on the extension and desktop app (shield-lists-v1).
 * Legacy BLOCK_KEY / TRUST_KEY helpers below only clear old localStorage leftovers.
 */

/** Whether this browser may store check history / drafts (not block lists). */
export function canPersistLists(mode: PrivacyMode = getPrivacyMode()): boolean {
  return mode === "local" || mode === "share";
}

/**
 * @deprecated Website no longer stores personal block lists. No-op; returns [].
 */
export function listBlocked(): [] {
  return [];
}

/**
 * @deprecated Website no longer stores personal trust lists. No-op; returns [].
 */
export function listTrusted(): [] {
  return [];
}

/**
 * @deprecated Always false on the website — blocking is extension/desktop only.
 */
export function isDomainBlocked(_domain: string): boolean {
  return false;
}

/**
 * @deprecated No-op on the website. Use extension or desktop personal lists.
 */
export function blockDomain(_domain: string, _reason?: string): { ok: boolean; persisted: boolean } {
  return { ok: false, persisted: false };
}

/**
 * @deprecated No-op on the website. Use extension or desktop personal lists.
 */
export function trustDomain(_domain: string): { ok: boolean; persisted: boolean } {
  return { ok: false, persisted: false };
}

/**
 * @deprecated No-op on the website.
 */
export function unblockDomain(_domain: string) {
  /* no-op */
}

/**
 * @deprecated No-op on the website.
 */
export function untrustDomain(_domain: string) {
  /* no-op */
}

/** Clear legacy website block/trust keys left from older builds. */
export function clearProtectionLists() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(BLOCK_KEY, "[]");
    localStorage.setItem(TRUST_KEY, "[]");
  } catch {
    /* ignore */
  }
}

/** When switching to never-store, drop history, drafts, diagnostics, and legacy list keys. */
export function applyPrivacyModeChange(mode: PrivacyMode) {
  if (mode === "off") {
    clearProtectionLists();
    try {
      localStorage.removeItem("shieldCheckHistory");
      localStorage.removeItem("shieldAnonymousLog");
      localStorage.removeItem("shieldFeedbackDrafts");
      localStorage.removeItem("shieldDiagnosticLog");
    } catch {
      /* ignore */
    }
  }
}