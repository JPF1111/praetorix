// @ts-check
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {{
 *   ok: true,
 *   score: number | null,
 *   severity: string | null,
 *   recommendation: string | null,
 *   analysisComplete: boolean | null,
 *   scannerVersion: string | null,
 * } | {
 *   ok: false,
 *   error: string,
 * }} ScanResult
 */

/**
 * Locate the `skillspector` binary: PATH first, then the common
 * `uv tool install` location. Never assumed to be at a fixed path only —
 * that broke portability in the previous bash/python implementation.
 * @returns {string | null}
 */
export function findSkillspectorBin() {
  const fromPath = which('skillspector');
  if (fromPath) return fromPath;

  const fallback = path.join(process.env.HOME || '', '.local', 'bin', 'skillspector');
  if (fs.existsSync(fallback)) return fallback;

  return null;
}

/**
 * Run `skillspector scan --no-llm --format json` against a directory and
 * return a normalized result.
 *
 * Applies the same completeness discipline SkillSpector's own MCP server
 * applies to `safe_to_install` (see docs/ANALYSIS_RESOURCE_BOUNDS.md):
 * when `analysis_completeness.is_complete` is false, a would-be clean
 * recommendation is not trusted at face value — callers of this function
 * should treat `analysisComplete === false` as grounds to require
 * CAUTION, not APPROVE, regardless of what `recommendation` says. This
 * function surfaces the flag; the verdict decision itself stays a human
 * (or Claude, via the skill-inspector skill) call, per this project's
 * two-independent-review-lines design — it does not silently downgrade
 * for you.
 *
 * @param {string} dir
 * @returns {ScanResult}
 */
export function runScan(dir) {
  const bin = findSkillspectorBin();
  if (!bin) {
    return {
      ok: false,
      error:
        "'skillspector' not found on PATH or at ~/.local/bin/skillspector. " +
        'Install it: uv tool install git+https://github.com/NVIDIA/skillspector.git',
    };
  }

  const proc = spawnSync(bin, ['scan', dir, '--no-llm', '--format', 'json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (proc.error) {
    return { ok: false, error: `failed to run skillspector: ${proc.error.message}` };
  }

  /** @type {any} */
  let parsed;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {
    return {
      ok: false,
      error: `skillspector did not produce parseable JSON (exit ${proc.status}): ${truncate(proc.stderr || proc.stdout, 500)}`,
    };
  }

  const risk = parsed.risk_assessment || {};
  const completeness = parsed.analysis_completeness || {};

  return {
    ok: true,
    score: typeof risk.score === 'number' ? risk.score : null,
    severity: typeof risk.severity === 'string' ? risk.severity : null,
    recommendation: typeof risk.recommendation === 'string' ? risk.recommendation : null,
    analysisComplete: typeof completeness.is_complete === 'boolean' ? completeness.is_complete : null,
    scannerVersion: typeof parsed.metadata?.version === 'string' ? parsed.metadata.version : null,
  };
}

/** @param {string} bin */
function which(bin) {
  const pathEnv = process.env.PATH || '';
  const sep = process.platform === 'win32' ? ';' : ':';
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const dir of pathEnv.split(sep)) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = path.join(dir, bin + ext);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        // not here, keep looking
      }
    }
  }
  return null;
}

/**
 * @param {string} s
 * @param {number} n
 */
function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
