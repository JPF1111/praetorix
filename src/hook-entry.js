#!/usr/bin/env node
// @ts-check

// The Claude Code PreToolUse hook entrypoint for the `Skill` tool.
//
// Deliberately a single Node.js process with zero shelled-out
// interpreters. The previous bash+python3 implementation's most serious
// defect was that it failed *open* whenever python3 happened to be
// missing or a `python3 -c` call errored — there was a second runtime in
// the critical path that could silently vanish. There is no equivalent
// failure mode here: if this file itself cannot execute, the plugin's
// own hook registration is broken and no skill runs at all, which is the
// correct fail-closed behavior for a "mandatory" gate.

import fs from 'node:fs';
import { resolveSkill } from './resolve.js';
import { hashSkillDir } from './hash.js';
import { loadLedger, ledgerExists, ledgerKey } from './ledger.js';
import { decide } from './gate.js';
import { appendAuditEntry } from './audit.js';
import { checkTrusted } from './trusted.js';

main();

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (err) {
    // Cannot even parse the hook payload — this is exactly the class of
    // failure the old implementation would fail open on. Deny instead.
    emit(denyResult(`praetorix: could not parse hook input: ${errMsg(err)}`));
    return;
  }

  const skillName = input?.tool_input?.skill;
  const cwd = typeof input?.cwd === 'string' ? input.cwd : process.cwd();

  if (typeof skillName !== 'string' || skillName.length === 0) {
    // No skill name in the payload at all — nothing to gate. This is the
    // one legitimate "allow" path that doesn't go through the full
    // decision matrix, and it's narrow: an empty/missing skill field,
    // not an unresolvable one.
    emit(allowResult());
    return;
  }

  let resolution;
  try {
    resolution = resolveSkill(skillName, cwd);
  } catch (err) {
    resolution = { status: 'error', reason: `resolver threw: ${errMsg(err)}` };
  }

  let currentHash = null;
  if (resolution.status === 'found') {
    try {
      currentHash = hashSkillDir(resolution.dir);
    } catch {
      currentHash = null;
    }
  }

  if (resolution.status === 'found' && currentHash) {
    const trustReason = checkTrusted(skillName, currentHash);
    if (trustReason) {
      try {
        appendAuditEntry({
          decision: 'allow',
          invocationName: skillName,
          resolvedPath: resolution.dir,
          hash: currentHash,
          reason: trustReason,
        });
      } catch {
        // never let audit logging block the decision
      }
      emit(allowResult());
      return;
    }
  }

  let ledgerEntry = null;
  if (resolution.status === 'found') {
    if (!ledgerExists()) {
      ledgerEntry = null;
    } else {
      try {
        const ledger = loadLedger();
        ledgerEntry = ledger[ledgerKey(skillName)] || null;
      } catch (err) {
        // A corrupt ledger must not fail open. Treat as "no entry" so the
        // decision matrix denies via the normal never_scanned path —
        // the user gets an actionable message instead of a silent allow.
        ledgerEntry = null;
      }
    }
  }

  const result = decide({ resolution, currentHash, ledgerEntry });

  try {
    appendAuditEntry({
      decision: result.decision,
      invocationName: skillName,
      resolvedPath: resolution.status === 'found' ? resolution.dir : null,
      hash: currentHash,
      reason: result.reason,
    });
  } catch {
    // Audit logging must never block the actual decision.
  }

  emit(
    result.decision === 'allow'
      ? allowResult()
      : denyResult(`praetorix: ${result.reason}`),
  );
}

function allowResult() {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

/** @param {string} reason */
function denyResult(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
}

/** @param {unknown} obj */
function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/** @param {unknown} err */
function errMsg(err) {
  return err instanceof Error ? err.message : String(err);
}
