// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { ledgerPath, praetorixHome } from './paths.js';

/**
 * @typedef {{
 *   key: string,
 *   skillName: string,
 *   invocationName: string,
 *   path: string,
 *   hash: string,
 *   verdict: 'APPROVE' | 'CAUTION' | 'REJECT',
 *   note: string,
 *   approvedBy: string,
 *   recordedAt: string,
 *   scannerVersion: string | null,
 *   scan: {
 *     ran: boolean,
 *     score: number | null,
 *     severity: string | null,
 *     recommendation: string | null,
 *     analysisComplete: boolean | null,
 *   },
 * }} LedgerEntry
 */

/**
 * Ledger entries are keyed by a stable *logical* identity — the skill's
 * invocation name (e.g. `mcp-server-dev:build-mcp-app`, or a bare global
 * skill name) — not by its resolved absolute directory path. Plugin
 * install paths are version-stamped (e.g.
 * `.../mcp-server-dev/c447c3207a42/...`), so keying by raw path meant
 * every plugin update turned a real prior approval into "never scanned"
 * instead of the more honest "stale, re-review." Keying by logical
 * identity and storing the resolved path/hash as data fixes that: an
 * install-path change alone doesn't invalidate approval, a content-hash
 * change does.
 *
 * @param {string} invocationName
 * @returns {string}
 */
export function ledgerKey(invocationName) {
  return invocationName;
}

/** @returns {Record<string, LedgerEntry>} */
export function loadLedger() {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return {};
  const raw = fs.readFileSync(p, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`ledger at ${p} is not a JSON object`);
  }
  return parsed;
}

/** @returns {boolean} */
export function ledgerExists() {
  return fs.existsSync(ledgerPath());
}

/**
 * Atomic write (tmp file + rename) with permissions locked to the owner
 * only. This does not defend against an attacker who already has local
 * code execution as you — nothing local-JSON-based can — but it closes
 * the trivial case (another user on a shared machine, a process running
 * under a different, less-trusted account) and makes tampering at least
 * detectable via the audit log.
 *
 * @param {Record<string, LedgerEntry>} ledger
 */
export function saveLedger(ledger) {
  const dir = praetorixHome();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const p = ledgerPath();
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(sortKeys(ledger), null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, p);
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    // best-effort; not fatal (e.g. filesystems that don't support POSIX perms)
  }
}

/** @param {Record<string, LedgerEntry>} obj */
function sortKeys(obj) {
  /** @type {Record<string, LedgerEntry>} */
  const out = {};
  for (const key of Object.keys(obj).sort()) out[key] = obj[key];
  return out;
}
