// @ts-check
import fs from 'node:fs';
import { auditLogPath, praetorixHome } from './paths.js';

/** One audit log file line does not exceed this many bytes before rotation. */
const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5 MiB

/**
 * Append one gate decision to the local, append-only audit log. This is
 * the closest thing to a tamper trail the current design has: the ledger
 * itself has no cryptographic integrity protection (see ledger.js), so
 * the audit log is what lets a human notice "an entry changed and I
 * don't have a decision on record for that."
 *
 * @param {{
 *   decision: 'allow' | 'deny',
 *   invocationName: string,
 *   resolvedPath: string | null,
 *   hash: string | null,
 *   reason: string,
 * }} entry
 */
export function appendAuditEntry(entry) {
  const dir = praetorixHome();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const p = auditLogPath();
  rotateIfNeeded(p);
  const line =
    JSON.stringify({
      ts: new Date().toISOString(),
      pid: process.pid,
      ...entry,
    }) + '\n';
  fs.appendFileSync(p, line, { mode: 0o600 });
}

/** @param {string} p */
function rotateIfNeeded(p) {
  let size = 0;
  try {
    size = fs.statSync(p).size;
  } catch {
    return;
  }
  if (size < MAX_LOG_BYTES) return;
  const rotated = `${p}.1`;
  try {
    fs.rmSync(rotated, { force: true });
    fs.renameSync(p, rotated);
  } catch {
    // best-effort rotation; never let logging failure block the gate
  }
}

/**
 * Read the last N audit entries (newest last), tolerant of a missing
 * file and of trailing partial/corrupt lines.
 * @param {number} limit
 * @returns {any[]}
 */
export function readRecentAuditEntries(limit = 50) {
  const p = auditLogPath();
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  const tail = lines.slice(-limit);
  /** @type {any[]} */
  const out = [];
  for (const line of tail) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // skip corrupt line rather than fail the whole read
    }
  }
  return out;
}
