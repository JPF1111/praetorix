// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { globalSkillsDir, installedPluginsManifestPath } from './paths.js';

/**
 * @typedef {{ status: 'found', dir: string }} ResolveFound
 * @typedef {{ status: 'not_applicable', reason: string }} ResolveNotApplicable
 * @typedef {{ status: 'error', reason: string }} ResolveError
 * @typedef {ResolveFound | ResolveNotApplicable | ResolveError} ResolveResult
 */

/**
 * Resolve a Claude Code Skill-tool `skill` argument to its real,
 * symlink-resolved, on-disk directory.
 *
 * Three-state result, deliberately not a two-state found/not-found:
 *
 *   - `found`         resolved to a real directory. Proceed to hash + ledger.
 *   - `not_applicable` confidently outside this gate's scope (Claude Code's
 *                      own bundled skills, or a claude.ai-synced skill —
 *                      neither has a directory this gate controls). Allow.
 *   - `error`         a name we should have been able to resolve, but
 *                      couldn't (a named plugin exists but its skill isn't
 *                      where our conventions expect it; a plugin name that
 *                      doesn't exist at all). DENY — never fall back to
 *                      "not_applicable" here. This is the fix for a real,
 *                      empirically-confirmed bypass: a plugin skill exposed
 *                      through a layout this resolver doesn't recognize
 *                      must not silently pass through as "out of scope."
 *
 * The bare-name/plugin-qualified-name split is what makes the
 * not_applicable/error distinction principled rather than a guess:
 * Claude Code's bundled skills and claude.ai-synced skills are always
 * invoked by a bare name (no `plugin:` prefix) — third-party plugin
 * skills are always invoked as `plugin:skill`. So:
 *
 *   - bare name, found nowhere we look       -> not_applicable
 *   - `plugin:skill`, anything not resolved  -> error (deny)
 *
 * Synced skills (`~/.claude/skills/synced/**`) are deliberately never
 * searched here — a bare-name lookup only ever checks
 * `~/.claude/skills/<name>` directly, one level deep, so a synced skill
 * naturally falls through to not_applicable instead of ever being
 * accidentally matched (or requiring a separate synced-skill special case).
 *
 * @param {string} name
 * @param {string} cwd
 * @returns {ResolveResult}
 */
export function resolveSkill(name, cwd) {
  if (!name) {
    return { status: 'error', reason: 'empty skill name' };
  }

  if (name.includes(':')) {
    return resolvePluginSkill(name);
  }

  return resolveBareSkill(name, cwd);
}

/**
 * @param {string} name
 * @returns {ResolveResult}
 */
function resolvePluginSkill(name) {
  const idx = name.indexOf(':');
  const pluginName = name.slice(0, idx);
  const skillName = name.slice(idx + 1);

  const manifestPath = installedPluginsManifestPath();
  /** @type {any} */
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    return {
      status: 'error',
      reason: `could not read installed plugins manifest at ${manifestPath}: ${errMsg(err)}`,
    };
  }

  const plugins = manifest?.plugins;
  if (!plugins || typeof plugins !== 'object') {
    return { status: 'error', reason: `installed plugins manifest at ${manifestPath} has no plugins map` };
  }

  /** @type {string[]} */
  const installPaths = [];
  for (const [key, entries] of Object.entries(plugins)) {
    const [entryPluginName] = String(key).split('@');
    if (entryPluginName !== pluginName) continue;
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (entry && typeof entry.installPath === 'string') installPaths.push(entry.installPath);
    }
  }

  if (installPaths.length === 0) {
    return { status: 'error', reason: `plugin '${pluginName}' is not in the installed plugins manifest` };
  }

  for (const installPath of installPaths) {
    const direct = path.join(installPath, 'skills', skillName);
    if (isSkillDir(direct)) return { status: 'found', dir: realpath(direct) };

    const found = findSkillDirBounded(installPath, skillName, 4);
    if (found) return { status: 'found', dir: realpath(found) };
  }

  return {
    status: 'error',
    reason:
      `plugin '${pluginName}' is installed (${installPaths.join(', ')}) but skill '${skillName}' ` +
      `was not found in any of its conventional skill locations`,
  };
}

/**
 * @param {string} name
 * @param {string} cwd
 * @returns {ResolveResult}
 */
function resolveBareSkill(name, cwd) {
  const globalDir = path.join(globalSkillsDir(), name);
  if (isSkillDir(globalDir)) {
    return { status: 'found', dir: realpath(globalDir) };
  }

  let dir = cwd;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, '.claude', 'skills', name);
    if (isSkillDir(candidate)) {
      return { status: 'found', dir: realpath(candidate) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return {
    status: 'not_applicable',
    reason: 'not found under any global or project skills directory — treated as a bundled or synced skill',
  };
}

/** @param {string} dir */
function isSkillDir(dir) {
  try {
    return fs.statSync(dir).isDirectory() && fs.statSync(path.join(dir, 'SKILL.md')).isFile();
  } catch {
    return false;
  }
}

/** @param {string} dir */
function realpath(dir) {
  try {
    return fs.realpathSync(dir);
  } catch {
    return dir;
  }
}

/**
 * Bounded search for a directory named `skillName` containing a SKILL.md,
 * under `root`, up to `maxDepth` levels deep. A fallback for plugins that
 * nest skills somewhere other than `<root>/skills/<name>`.
 * @param {string} root
 * @param {string} skillName
 * @param {number} maxDepth
 * @returns {string | null}
 */
function findSkillDirBounded(root, skillName, maxDepth) {
  /** @type {Array<{ dir: string, depth: number }>} */
  const stack = [{ dir: root, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = /** @type {{dir: string, depth: number}} */ (stack.pop());
    if (depth > maxDepth) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === skillName && isSkillDir(full)) return full;
      stack.push({ dir: full, depth: depth + 1 });
    }
  }
  return null;
}

/** @param {unknown} err */
function errMsg(err) {
  return err instanceof Error ? err.message : String(err);
}
