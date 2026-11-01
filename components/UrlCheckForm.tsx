"use client";

/**
 * Website check form — submits a URL only via onCheck.
 * Never sends personalListBlocked (extension/desktop read-only hint only).
 */
import { useState } from "react";
import { Icon } from "./icons";

export function UrlCheckForm({
  t,
  initialUrl = "",
  compact = false,
  bare = false,
  disabled = false,
  onCheck
}: {
  t: Record<string, string>;
  initialUrl?: string;
  compact?: boolean;
  bare?: boolean;
  /** When true (e.g. rate-limit countdown), submit is blocked until re-enabled. */
  disabled?: boolean;
  onCheck: (url: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    try {
      const value = /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      setError("");
      onCheck(url);
    } catch {
      setError(t.invalid);
    }
  }

  return (
    <form
      className={`check-card ${compact ? "compact" : ""} ${bare ? "instrument-check" : ""}`}
      onSubmit={submit}
      noValidate
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="url" className={bare ? "visually-hidden" : undefined}>
            {t.address}
          </label>
          <div className="url-input">
            {!bare && <Icon name="globe" />}
            <input
              id="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={bare ? t.placeholder.replace(/^https?:\/\//, "") : t.placeholder}
              aria-describedby={error ? "url-error" : "privacy-note"}
            />
          </div>
        </div>
        <button className="primary-button" type="submit" disabled={disabled}>
          {bare ? (
            t.go
          ) : (
            <>
              <Icon name="search" />
              {t.check}
              <Icon name="arrow" />
            </>
          )}
        </button>
      </div>
      {error && (
        <p id="url-error" className="form-error" role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
      {!compact && !bare && (
        <p id="privacy-note" className="privacy-note">
          <Icon name="lock" size={14} />
          {t.privacy}
        </p>
      )}
    </form>
  );
}