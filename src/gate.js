// @ts-check

/**
 * @typedef {{
 *   decision: 'allow' | 'deny',
 *   reason: string,
 *   code:
 *     | 'not_applicable'
 *     | 'resolve_error'
 *     | 'hash_error'
 *     | 'never_scanned'
 *     | 'stale'
 *     | 'rejected'
 *     | 'approved',
 * }} GateDecision
 */

/**
 * The full gate decision matrix, as a pure function: given a resolution
 * result, a current content hash (if resolvable), and a possibly-absent
 * ledger entry, decide allow or deny. No I/O in this function on
 * purpose — everything it needs is passed in, which is what makes the
 * whole decision table unit-testable without touching the filesystem.
 *
 * Fail-closed is structural here: every branch is enumerated explicitly
 * and the fallback for anything not enumerated is deny. There is no
 * "if in doubt, allow" path anywhere in this function.
 *
 * @param {{
 *   resolution: import('./resolve.js').ResolveResult,
 *   currentHash: string | null,
 *   ledgerEntry: import('./ledger.js').LedgerEntry | null | undefined,
 * }} input
 * @returns {GateDecision}
 */
export function decide({ resolution, currentHash, ledgerEntry }) {
  if (resolution.status === 'not_applicable') {
    return { decision: 'allow', reason: resolution.reason, code: 'not_applicable' };
  }

  if (resolution.status === 'error') {
    return {
      decision: 'deny',
      reason: `could not confidently resolve this skill: ${resolution.reason}`,
      code: 'resolve_error',
    };
  }

  // resolution.status === 'found'
  if (currentHash === null) {
    return {
      decision: 'deny',
      reason: `could not hash ${resolution.dir} — blocked fail-closed`,
      code: 'hash_error',
    };
  }

  if (!ledgerEntry) {
    return {
      decision: 'deny',
      reason: `${resolution.dir} has never been scanned/approved`,
      code: 'never_scanned',
    };
  }

  if (ledgerEntry.hash !== currentHash) {
    return {
      decision: 'deny',
      reason: `${resolution.dir} changed since its last scan (content hash mismatch) — its prior '${ledgerEntry.verdict}' verdict no longer applies`,
      code: 'stale',
    };
  }

  if (ledgerEntry.verdict === 'REJECT') {
    return {
      decision: 'deny',
      reason: `${resolution.dir} was scanned and REJECTED`,
      code: 'rejected',
    };
  }

  if (ledgerEntry.verdict === 'APPROVE' || ledgerEntry.verdict === 'CAUTION') {
    return {
      decision: 'allow',
      reason: `approved (${ledgerEntry.verdict})`,
      code: 'approved',
    };
  }

  // Any verdict value not explicitly APPROVE/CAUTION/REJECT is unrecognized
  // ledger state. Deny, don't guess.
  return {
    decision: 'deny',
    reason: `ledger entry for ${resolution.dir} has an unrecognized verdict — blocked fail-closed`,
    code: 'resolve_error',
  };
}
