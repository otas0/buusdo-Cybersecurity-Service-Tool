/**
 * Classic (non-module) copy for MV3 service workers that use importScripts.
 * Keep in sync with shield-lists.mjs.
 */
(function (global) {
  const SHIELD_LISTS_SCHEMA = "shield-lists-v1";

  function emptyLists(updatedAt) {
    return {
      schema: SHIELD_LISTS_SCHEMA,
      updatedAt: updatedAt || new Date().toISOString(),
      blocked: [],
      trusted: []
    };
  }

  function normalizeListHost(raw) {
    let value = String(raw || "")
      .trim()
      .toLowerCase();
    if (!value) throw new Error("empty-host");
    if (value.includes("://")) value = new URL(value).hostname;
    value = value.replace(/\.$/, "").split("/")[0] || "";
    value = value.replace(/^www\./, "");
    if (!value || value.includes(" ") || !value.includes(".")) {
      throw new Error("invalid-host:" + raw);
    }
    return value;
  }

  function normalizeEntry(entry, withReason) {
    const domain = normalizeListHost(entry && entry.domain != null ? entry.domain : entry);
    const createdAt =
      entry && typeof entry.createdAt === "string" && entry.createdAt
        ? entry.createdAt
        : new Date().toISOString();
    if (withReason) {
      return {
        domain: domain,
        reason: String((entry && entry.reason) || "user").slice(0, 80),
        createdAt: createdAt
      };
    }
    return { domain: domain, createdAt: createdAt };
  }

  function dedupeByDomain(entries) {
    const map = new Map();
    for (const item of entries) map.set(item.domain, item);
    return Array.from(map.values()).sort(function (a, b) {
      return a.domain.localeCompare(b.domain);
    });
  }

  function parseBackup(raw) {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") throw new Error("invalid-backup");
    if (data.schema !== SHIELD_LISTS_SCHEMA) {
      throw new Error("unsupported-schema:" + (data.schema || "missing"));
    }
    return {
      schema: SHIELD_LISTS_SCHEMA,
      updatedAt:
        typeof data.updatedAt === "string" && data.updatedAt
          ? data.updatedAt
          : new Date().toISOString(),
      blocked: Array.isArray(data.blocked)
        ? dedupeByDomain(data.blocked.map(function (e) {
            return normalizeEntry(e, true);
          }))
        : [],
      trusted: Array.isArray(data.trusted)
        ? dedupeByDomain(data.trusted.map(function (e) {
            return normalizeEntry(e, false);
          }))
        : []
    };
  }

  function serializeBackup(lists) {
    const next = {
      schema: SHIELD_LISTS_SCHEMA,
      updatedAt: lists.updatedAt || new Date().toISOString(),
      blocked: dedupeByDomain(
        (lists.blocked || []).map(function (e) {
          return normalizeEntry(e, true);
        })
      ),
      trusted: dedupeByDomain(
        (lists.trusted || []).map(function (e) {
          return normalizeEntry(e, false);
        })
      )
    };
    return JSON.stringify(next, null, 2) + "\n";
  }

  function mergeBackups(current, incoming) {
    const blocked = dedupeByDomain([].concat(current.blocked || [], incoming.blocked || []));
    const trusted = dedupeByDomain([].concat(current.trusted || [], incoming.trusted || []));
    const blockedSet = new Set(
      blocked.map(function (e) {
        return e.domain;
      })
    );
    return {
      schema: SHIELD_LISTS_SCHEMA,
      updatedAt: new Date().toISOString(),
      blocked: blocked,
      trusted: trusted.filter(function (e) {
        return !blockedSet.has(e.domain);
      })
    };
  }

  function addBlocked(lists, domain, reason) {
    const entry = normalizeEntry({ domain: domain, reason: reason || "user" }, true);
    return {
      schema: SHIELD_LISTS_SCHEMA,
      updatedAt: new Date().toISOString(),
      blocked: dedupeByDomain([].concat(lists.blocked || [], [entry])),
      trusted: (lists.trusted || []).filter(function (e) {
        return e.domain !== entry.domain;
      })
    };
  }

  function addTrusted(lists, domain) {
    const entry = normalizeEntry({ domain: domain }, false);
    return {
      schema: SHIELD_LISTS_SCHEMA,
      updatedAt: new Date().toISOString(),
      blocked: (lists.blocked || []).filter(function (e) {
        return e.domain !== entry.domain;
      }),
      trusted: dedupeByDomain([].concat(lists.trusted || [], [entry]))
    };
  }

  function removeDomain(lists, domain) {
    const host = normalizeListHost(domain);
    return {
      schema: SHIELD_LISTS_SCHEMA,
      updatedAt: new Date().toISOString(),
      blocked: (lists.blocked || []).filter(function (e) {
        return e.domain !== host;
      }),
      trusted: (lists.trusted || []).filter(function (e) {
        return e.domain !== host;
      })
    };
  }

  function backupDownloadName(date) {
    const d = date || new Date();
    return "shield-backup-" + d.toISOString().slice(0, 10) + ".json";
  }

  var PERSONAL_DNR_RULE_LIMIT = 500;

  var QR_ZLIB_PREFIX = "ZB1:";

  function compactPayloadForQr(lists, maxHosts, opts) {
    const n = maxHosts == null ? 40 : maxHosts;
    const dense = JSON.stringify({
      b: (lists.blocked || []).slice(0, n).map(function (e) {
        return e.domain;
      }),
      t: (lists.trusted || []).slice(0, n).map(function (e) {
        return e.domain;
      })
    });
    // Browser classic cannot deflate sync — zlib mode is Node/desktop only.
    if (opts && opts.zlib) {
      throw new Error("zlib-qr-node-only");
    }
    return dense;
  }

  function parseDenseOrFull(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("invalid-backup");
    }
    if (data.schema === SHIELD_LISTS_SCHEMA) return parseBackup(data);
    const blocked = Array.isArray(data.b)
      ? data.b
      : Array.isArray(data.blocked)
        ? data.blocked
        : null;
    const trusted = Array.isArray(data.t)
      ? data.t
      : Array.isArray(data.trusted)
        ? data.trusted
        : null;
    if (!blocked && !trusted) throw new Error("invalid-backup");
    return parseBackup({
      schema: SHIELD_LISTS_SCHEMA,
      updatedAt: new Date().toISOString(),
      blocked: (blocked || []).map(function (item) {
        return typeof item === "string" ? { domain: item } : item;
      }),
      trusted: (trusted || []).map(function (item) {
        return typeof item === "string" ? { domain: item } : item;
      })
    });
  }

  function stripJsonTrailingCommas(text) {
    var s = String(text);
    var out = "";
    var inString = false;
    var escape = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (inString) {
        out += c;
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        out += c;
        continue;
      }
      if (c === ",") {
        var j = i + 1;
        while (j < s.length && /\s/.test(s[j])) j++;
        if (j < s.length && (s[j] === "]" || s[j] === "}")) continue;
      }
      out += c;
    }
    return out;
  }

  function expandQrOrBackup(raw) {
    try {
      var data = raw;
      if (typeof raw === "string") {
        var trimmed = raw.trim();
        if (trimmed.indexOf(QR_ZLIB_PREFIX) === 0) {
          throw new Error("zlib-async-required");
        }
        data = JSON.parse(stripJsonTrailingCommas(trimmed));
      }
      return parseDenseOrFull(data);
    } catch (err) {
      if (err && err.message === "invalid-backup") throw err;
      if (err && err.message === "zlib-async-required") throw err;
      throw new Error("invalid-backup");
    }
  }

  /** Browser: inflate ZB1: via DecompressionStream when available. */
  function expandQrOrBackupAsync(raw) {
    if (typeof raw !== "string" || raw.trim().indexOf(QR_ZLIB_PREFIX) !== 0) {
      try {
        return Promise.resolve(expandQrOrBackup(raw));
      } catch (err) {
        return Promise.reject(
          err && err.message === "invalid-backup" ? err : new Error("invalid-backup")
        );
      }
    }
    if (typeof DecompressionStream === "undefined") {
      return Promise.reject(new Error("invalid-backup"));
    }
    try {
      var b64 = raw.trim().slice(QR_ZLIB_PREFIX.length);
      var bin = Uint8Array.from(atob(b64), function (c) {
        return c.charCodeAt(0);
      });
      var ds = new DecompressionStream("deflate");
      var stream = new Blob([bin]).stream().pipeThrough(ds);
      return new Response(stream)
        .text()
        .then(function (json) {
          return parseDenseOrFull(JSON.parse(stripJsonTrailingCommas(json)));
        })
        .catch(function () {
          throw new Error("invalid-backup");
        });
    } catch (_) {
      return Promise.reject(new Error("invalid-backup"));
    }
  }

  function listHostCount(lists) {
    return ((lists && lists.blocked && lists.blocked.length) || 0) +
      ((lists && lists.trusted && lists.trusted.length) || 0);
  }

  function isDomainBlockedInLists(lists, domain) {
    try {
      const host = normalizeListHost(domain);
      return (lists.blocked || []).some(function (e) {
        return e.domain === host;
      });
    } catch (_) {
      return false;
    }
  }

  function isDomainTrustedInLists(lists, domain) {
    try {
      const host = normalizeListHost(domain);
      return (lists.trusted || []).some(function (e) {
        return e.domain === host;
      });
    } catch (_) {
      return false;
    }
  }

  global.ShieldLists = {
    SHIELD_LISTS_SCHEMA: SHIELD_LISTS_SCHEMA,
    PERSONAL_DNR_RULE_LIMIT: PERSONAL_DNR_RULE_LIMIT,
    emptyLists: emptyLists,
    normalizeListHost: normalizeListHost,
    parseBackup: parseBackup,
    serializeBackup: serializeBackup,
    mergeBackups: mergeBackups,
    addBlocked: addBlocked,
    addTrusted: addTrusted,
    removeDomain: removeDomain,
    QR_ZLIB_PREFIX: QR_ZLIB_PREFIX,
    backupDownloadName: backupDownloadName,
    compactPayloadForQr: compactPayloadForQr,
    stripJsonTrailingCommas: stripJsonTrailingCommas,
    expandQrOrBackup: expandQrOrBackup,
    expandQrOrBackupAsync: expandQrOrBackupAsync,
    listHostCount: listHostCount,
    isDomainBlockedInLists: isDomainBlockedInLists,
    isDomainTrustedInLists: isDomainTrustedInLists
  };
})(typeof globalThis !== "undefined" ? globalThis : self);