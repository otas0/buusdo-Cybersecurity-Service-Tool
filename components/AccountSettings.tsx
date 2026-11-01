"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../i18n/messages";
import { getMessages } from "../i18n/messages";
import { getPrivacyMode, type PrivacyMode } from "./report-analysis";

const SYNC_TOGGLE_KEY = "shieldAccountSyncLists";
const STAGING_KEY = "shieldAccountListsStaging";
const CLOUD_UPDATED_KEY = "shieldAccountCloudUpdatedAt";

type SessionState =
  | { status: "loading" }
  | { status: "disabled" }
  | { status: "signedOut" }
  | { status: "signedIn"; email: string };

type ConflictMode = "merge" | "replace-cloud" | "replace-device";

function noticeForSyncError(
  status: number,
  error: string | undefined,
  t: ReturnType<typeof getMessages>
): string {
  if (status === 413) {
    if (error === "lists-too-many-entries") return t.accountListsTooMany;
    if (error === "lists-too-large") return t.accountListsTooLarge;
    return t.accountListsCap;
  }
  return error || t.accountError;
}

export function AccountSettings({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [syncOn, setSyncOn] = useState(false);
  const [notice, setNotice] = useState("");
  const [devLink, setDevLink] = useState("");
  const [stagingJson, setStagingJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<unknown>(null);
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);

  function privacy(): PrivacyMode {
    return getPrivacyMode();
  }

  function loadSyncToggle() {
    try {
      setSyncOn(localStorage.getItem(SYNC_TOGGLE_KEY) === "1");
      const staged = localStorage.getItem(STAGING_KEY);
      if (staged) setStagingJson(staged);
      setCloudUpdatedAt(localStorage.getItem(CLOUD_UPDATED_KEY));
    } catch {
      setSyncOn(false);
    }
  }

  function persistStaging(next: string, updatedAt?: string | null) {
    setStagingJson(next);
    try {
      localStorage.setItem(STAGING_KEY, next);
      if (updatedAt) {
        localStorage.setItem(CLOUD_UPDATED_KEY, updatedAt);
        setCloudUpdatedAt(updatedAt);
      }
    } catch {
      /* ignore */
    }
  }

  async function refreshSession() {
    try {
      const health = (await fetch("/api/health").then((r) => r.json())) as {
        accountSyncEnabled?: boolean;
      };
      if (!health?.accountSyncEnabled) {
        setSession({ status: "disabled" });
        return;
      }
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (res.status === 401) {
        setSession({ status: "signedOut" });
        return;
      }
      const data = (await res.json()) as { ok?: boolean; email?: string };
      if (data.ok && data.email) {
        setSession({ status: "signedIn", email: data.email });
      } else {
        setSession({ status: "signedOut" });
      }
    } catch {
      setSession({ status: "disabled" });
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      loadSyncToggle();
      void refreshSession();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function onSyncToggle(next: boolean) {
    setSyncOn(next);
    try {
      if (next) localStorage.setItem(SYNC_TOGGLE_KEY, "1");
      else localStorage.removeItem(SYNC_TOGGLE_KEY);
    } catch {
      /* ignore */
    }
  }

  async function requestMagic() {
    setBusy(true);
    setNotice("");
    setDevLink("");
    try {
      const res = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, client: "web" })
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        devLink?: string;
      };
      if (!res.ok || !data.ok) {
        setNotice(data.error || t.accountError);
        return;
      }
      setNotice(t.accountMagicSent);
      if (data.devLink) setDevLink(data.devLink);
    } catch {
      setNotice(t.accountError);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setNotice(t.accountSignedOut);
      setSession({ status: "signedOut" });
    } catch {
      setNotice(t.accountError);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm(t.accountDeleteConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) {
        setNotice(t.accountError);
        return;
      }
      setNotice(t.accountDeleted);
      setSession({ status: "signedOut" });
      try {
        localStorage.removeItem(STAGING_KEY);
        localStorage.removeItem(CLOUD_UPDATED_KEY);
      } catch {
        /* ignore */
      }
      setStagingJson("");
      setCloudUpdatedAt(null);
      setShowConflict(false);
    } catch {
      setNotice(t.accountError);
    } finally {
      setBusy(false);
    }
  }

  async function exportGdpr() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/account/export", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; export?: unknown; error?: string };
      if (!res.ok || !data.ok) {
        setNotice(data.error || t.accountError);
        return;
      }
      const blob = new Blob([JSON.stringify(data.export, null, 2)], {
        type: "application/json"
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `shield-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setNotice(t.accountExportDone);
    } catch {
      setNotice(t.accountError);
    } finally {
      setBusy(false);
    }
  }

  async function putWithMode(
    backup: unknown,
    mode: ConflictMode
  ): Promise<{ ok: boolean; conflict: boolean }> {
    const put = await fetch("/api/sync/lists", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backup,
        client: "web",
        baseUpdatedAt: cloudUpdatedAt,
        mode
      })
    });
    const putData = (await put.json()) as {
      ok?: boolean;
      error?: string;
      backup?: unknown;
      merged?: boolean;
      conflict?: boolean;
      updatedAt?: string;
    };
    if (!put.ok || !putData.ok) {
      setNotice(noticeForSyncError(put.status, putData.error, t));
      return { ok: false, conflict: false };
    }
    if (putData.backup) {
      persistStaging(JSON.stringify(putData.backup, null, 2), putData.updatedAt);
    }
    if (putData.conflict && mode === "merge") {
      setPendingBackup(backup);
      setShowConflict(true);
      setNotice(t.accountConflictHint);
      return { ok: true, conflict: true };
    }
    setShowConflict(false);
    setPendingBackup(null);
    setNotice(putData.merged ? t.accountSyncMerged : t.accountSyncPushed);
    return { ok: true, conflict: false };
  }

  async function resolveConflict(mode: ConflictMode) {
    if (!pendingBackup) return;
    setBusy(true);
    try {
      await putWithMode(pendingBackup, mode);
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (!syncOn) {
      setNotice(t.accountSyncNeedToggle);
      return;
    }
    if (privacy() === "off") {
      setNotice(t.accountSyncNeedPrivacy);
      return;
    }
    setBusy(true);
    setNotice("");
    setShowConflict(false);
    try {
      let pushed = false;
      if (stagingJson.trim()) {
        let backup: unknown;
        try {
          backup = JSON.parse(stagingJson);
        } catch {
          setNotice(t.accountStagingInvalid);
          setBusy(false);
          return;
        }
        const result = await putWithMode(backup, "merge");
        if (!result.ok) {
          setBusy(false);
          return;
        }
        pushed = true;
        if (result.conflict) {
          setBusy(false);
          return;
        }
      }

      const get = await fetch("/api/sync/lists", { credentials: "include" });
      const getData = (await get.json()) as {
        ok?: boolean;
        backup?: unknown;
        error?: string;
        updatedAt?: string | null;
      };
      if (!get.ok || !getData.ok) {
        setNotice(getData.error || t.accountError);
        return;
      }
      if (getData.backup) {
        persistStaging(JSON.stringify(getData.backup, null, 2), getData.updatedAt);
        if (!pushed) setNotice(t.accountSyncPulled);
      } else if (!pushed) {
        setNotice(t.accountSyncEmpty);
      }
    } catch {
      setNotice(t.accountError);
    } finally {
      setBusy(false);
    }
  }

  if (session.status === "loading") {
    return (
      <section className="settings-block" id="settings-account" data-testid="settings-account">
        <h2>{t.accountTitle}</h2>
        <p className="hint">{t.accountLoading}</p>
      </section>
    );
  }

  if (session.status === "disabled") {
    return (
      <section className="settings-block" id="settings-account" data-testid="settings-account">
        <h2>{t.accountTitle}</h2>
        <p className="hint" data-testid="settings-account-disabled">
          {t.accountDisabled}
        </p>
        <p className="scope-note">{t.accountOfflineBackup}</p>
      </section>
    );
  }

  return (
    <section className="settings-block" id="settings-account" data-testid="settings-account">
      <h2>{t.accountTitle}</h2>
      <p className="hint">{t.accountHint}</p>
      <p className="scope-note">{t.accountSignOutNote}</p>

      {session.status === "signedOut" ? (
        <form
          className="account-sign-in"
          data-testid="settings-account-signin"
          onSubmit={(e) => {
            e.preventDefault();
            void requestMagic();
          }}
        >
          <label className="privacy">
            <span className="visually-hidden">{t.accountEmail}</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.accountEmailPlaceholder}
              aria-label={t.accountEmail}
              data-testid="settings-account-email"
            />
          </label>
          <button type="submit" className="text-button" disabled={busy} data-testid="settings-account-send">
            {t.accountSendLink}
          </button>
        </form>
      ) : (
        <div data-testid="settings-account-signed-in">
          <p className="hint">
            {t.accountSignedInAs.replace("{email}", session.email)}
          </p>
          <label className="privacy">
            <input
              type="checkbox"
              checked={syncOn}
              onChange={(e) => onSyncToggle(e.target.checked)}
              data-testid="settings-account-sync-toggle"
            />{" "}
            {t.accountSyncToggle}
          </label>
          <p className="hint">{t.accountSyncToggleHint}</p>
          <label className="privacy">
            <span className="visually-hidden">{t.accountStagingLabel}</span>
            <textarea
              rows={4}
              spellCheck={false}
              value={stagingJson}
              onChange={(e) => setStagingJson(e.target.value)}
              placeholder={t.accountStagingPlaceholder}
              aria-label={t.accountStagingLabel}
              data-testid="settings-account-staging"
            />
          </label>
          {showConflict ? (
            <div className="list-actions" data-testid="settings-account-conflict" role="group" aria-label={t.accountConflictHint}>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => void resolveConflict("merge")}
                data-testid="settings-account-keep-merged"
              >
                {t.accountKeepMerged}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => void resolveConflict("replace-cloud")}
                data-testid="settings-account-replace-cloud"
              >
                {t.accountReplaceCloud}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => void resolveConflict("replace-device")}
                data-testid="settings-account-replace-device"
              >
                {t.accountReplaceDevice}
              </button>
            </div>
          ) : null}
          <div className="list-actions">
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void syncNow()}
              data-testid="settings-account-sync-now"
            >
              {t.accountSyncNow}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void exportGdpr()}
              data-testid="settings-account-export"
            >
              {t.accountExport}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void signOut()}
              data-testid="settings-account-signout"
            >
              {t.accountSignOut}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void deleteAccount()}
              data-testid="settings-account-delete"
            >
              {t.accountDelete}
            </button>
          </div>
        </div>
      )}

      {devLink ? (
        <p className="hint">
          <a className="text-button" href={devLink} data-testid="settings-account-dev-link">
            {t.accountDevLink}
          </a>
        </p>
      ) : null}
      {notice ? (
        <p className="scope-note" role="status" data-testid="settings-account-notice">
          {notice}
        </p>
      ) : null}
      <p className="hint">{t.accountOfflineBackup}</p>
    </section>
  );
}