// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveSkill } from '../src/resolve.js';

function withEnv(overrides, fn) {
  const prev = {};
  for (const k of Object.keys(overrides)) prev[k] = process.env[k];
  Object.assign(process.env, overrides);
  try {
    return fn();
  } finally {
    for (const k of Object.keys(overrides)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

function freshConfigDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'praetorix-config-'));
}

test('bare name resolves against the global skills directory', () => {
  const configDir = freshConfigDir();
  const skillDir = path.join(configDir, 'skills', 'my-skill');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: my-skill\n---\n');

  withEnv({ CLAUDE_CONFIG_DIR: configDir }, () => {
    const result = resolveSkill('my-skill', os.tmpdir());
    assert.equal(result.status, 'found');
    assert.equal(fs.realpathSync(/** @type {any} */ (result).dir), fs.realpathSync(skillDir));
  });
});

test('bare name not found anywhere is not_applicable (allow) — bundled/synced skill territory', () => {
  const configDir = freshConfigDir();
  fs.mkdirSync(path.join(configDir, 'skills'), { recursive: true });

  withEnv({ CLAUDE_CONFIG_DIR: configDir }, () => {
    const result = resolveSkill('update-config', os.tmpdir());
    assert.equal(result.status, 'not_applicable');
  });
});

test('bare name resolves against a project-level .claude/skills walking up from cwd', () => {
  const configDir = freshConfigDir();
  fs.mkdirSync(path.join(configDir, 'skills'), { recursive: true });

  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'praetorix-project-'));
  const nestedCwd = path.join(projectRoot, 'packages', 'app');
  fs.mkdirSync(nestedCwd, { recursive: true });
  const skillDir = path.join(projectRoot, '.claude', 'skills', 'proj-skill');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: proj-skill\n---\n');

  withEnv({ CLAUDE_CONFIG_DIR: configDir }, () => {
    const result = resolveSkill('proj-skill', nestedCwd);
    assert.equal(result.status, 'found');
  });
});

test('plugin:skill resolves via installed_plugins.json + skills/<name>', () => {
  const configDir = freshConfigDir();
  const pluginInstallPath = fs.mkdtempSync(path.join(os.tmpdir(), 'praetorix-plugin-'));
  const skillDir = path.join(pluginInstallPath, 'skills', 'build-x');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: build-x\n---\n');

  fs.mkdirSync(path.join(configDir, 'plugins'), { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'plugins', 'installed_plugins.json'),
    JSON.stringify({
      version: 2,
      plugins: {
        'my-plugin@my-marketplace': [{ scope: 'user', installPath: pluginInstallPath }],
      },
    }),
  );

  withEnv({ CLAUDE_CONFIG_DIR: configDir }, () => {
    const result = resolveSkill('my-plugin:build-x', os.tmpdir());
    assert.equal(result.status, 'found');
  });
});

test('plugin:skill for a REAL installed plugin whose skill cannot be located is an error (deny) — not allowed through', () => {
  // This is the regression test for the empirically-confirmed bypass in
  // the previous implementation: a plugin genuinely exists, but the
  // named skill isn't where any known convention expects it. That must
  // never resolve to "not_applicable".
  const configDir = freshConfigDir();
  const pluginInstallPath = fs.mkdtempSync(path.join(os.tmpdir(), 'praetorix-plugin-nosk-'));
  fs.mkdirSync(path.join(pluginInstallPath, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(pluginInstallPath, 'commands'), { recursive: true });
  // deliberately no skills/ directory at all

  fs.mkdirSync(path.join(configDir, 'plugins'), { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'plugins', 'installed_plugins.json'),
    JSON.stringify({
      version: 2,
      plugins: {
        'feature-dev@claude-plugins-official': [{ scope: 'user', installPath: pluginInstallPath }],
      },
    }),
  );

  withEnv({ CLAUDE_CONFIG_DIR: configDir }, () => {
    const result = resolveSkill('feature-dev:feature-dev', os.tmpdir());
    assert.equal(result.status, 'error');
  });
});

test('plugin:skill for a plugin not in the manifest at all is an error (deny)', () => {
  const configDir = freshConfigDir();
  fs.mkdirSync(path.join(configDir, 'plugins'), { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'plugins', 'installed_plugins.json'),
    JSON.stringify({ version: 2, plugins: {} }),
  );

  withEnv({ CLAUDE_CONFIG_DIR: configDir }, () => {
    const result = resolveSkill('nonexistent-plugin:whatever', os.tmpdir());
    assert.equal(result.status, 'error');
  });
});

test('a synced skill (nested under skills/synced/) is never matched by the bare-name lookup', () => {
  const configDir = freshConfigDir();
  const syncedSkillDir = path.join(configDir, 'skills', 'synced', 'some-bucket', 'my-skill');
  fs.mkdirSync(syncedSkillDir, { recursive: true });
  fs.writeFileSync(path.join(syncedSkillDir, 'SKILL.md'), '---\nname: my-skill\n---\n');

  withEnv({ CLAUDE_CONFIG_DIR: configDir }, () => {
    const result = resolveSkill('my-skill', os.tmpdir());
    // Must fall through to not_applicable, not accidentally match the
    // synced copy one level too deep.
    assert.equal(result.status, 'not_applicable');
  });
});
