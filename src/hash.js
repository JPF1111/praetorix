// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Directories and files never hashed as part of a skill's content —
 * VCS metadata, language caches, and editor artifacts that change without
 * the skill's actual behavior changing. An unbounded hash-everything
 * approach causes false STALE denials on things like a `.git/` folder or
 * a stray `__pycache__/`.
 */
const EXCLUDED_DIR_NAMES = new Set([
  '.git',
  '.hg',
  '.svn',
  '__pycache__',
  '.venv',
  'venv',
  'node_modules',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
]);

const EXCLUDED_FILE_NAMES = new Set(['.DS_Store']);

/** Cap follow depth so a symlink cycle can't hang the hook. */
const MAX_SYMLINK_DEPTH = 40;

/**
 * Deterministic content hash of a skill directory: SHA-256 of every
 * tracked file's relative path + contents, sorted by path, hashed
 * together. Order-independent; changes the instant any file's content,
 * name, or presence changes.
 *
 * Symlinks are followed (unlike a plain `fs.readdir`-based walk), so a
 * symlink's target content is what's actually hashed — swapping a
 * symlink's target without touching the skill directory itself still
 * invalidates the hash. Cycles are bounded, not infinite-looped.
 *
 * @param {string} dir
 * @returns {string} lowercase hex sha256
 */
export function hashSkillDir(dir) {
  const files = collectFiles(dir);
  const hash = crypto.createHash('sha256');
  for (const rel of files.sort()) {
    const full = path.join(dir, rel);
    hash.update(rel);
    hash.update('\n');
    hash.update(fs.readFileSync(full));
  }
  return hash.digest('hex');
}

/**
 * @param {string} root
 * @returns {string[]} relative paths, POSIX-separated
 */
function collectFiles(root) {
  /** @type {string[]} */
  const out = [];
  walk(root, '', out, 0, new Set());
  return out;
}

/**
 * @param {string} absDir
 * @param {string} relDir
 * @param {string[]} out
 * @param {number} depth
 * @param {Set<string>} visitedRealDirs guards against symlink cycles
 */
function walk(absDir, relDir, out, depth, visitedRealDirs) {
  if (depth > MAX_SYMLINK_DEPTH) return;

  let realDir;
  try {
    realDir = fs.realpathSync(absDir);
  } catch {
    return;
  }
  if (visitedRealDirs.has(realDir)) return;
  visitedRealDirs.add(realDir);

  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absChild = path.join(absDir, entry.name);
    const relChild = relDir ? `${relDir}/${entry.name}` : entry.name;

    if (entry.isSymbolicLink()) {
      let stat;
      try {
        stat = fs.statSync(absChild); // follows the link
      } catch {
        continue; // dangling symlink: nothing to hash, skip
      }
      if (stat.isDirectory()) {
        if (isExcludedDir(entry.name)) continue;
        walk(absChild, relChild, out, depth + 1, visitedRealDirs);
      } else if (stat.isFile()) {
        if (!isExcludedFile(entry.name)) out.push(relChild);
      }
      continue;
    }

    if (entry.isDirectory()) {
      if (isExcludedDir(entry.name)) continue;
      walk(absChild, relChild, out, depth + 1, visitedRealDirs);
    } else if (entry.isFile()) {
      if (!isExcludedFile(entry.name)) out.push(relChild);
    }
  }
}

/** @param {string} name */
function isExcludedDir(name) {
  return EXCLUDED_DIR_NAMES.has(name);
}

/** @param {string} name */
function isExcludedFile(name) {
  return EXCLUDED_FILE_NAMES.has(name);
}
