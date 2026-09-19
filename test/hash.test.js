// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashSkillDir } from '../src/hash.js';

function mkSkill(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'praetorix-hash-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

test('hash is stable across repeated calls on identical content', () => {
  const dir = mkSkill({ 'SKILL.md': '---\nname: x\n---\nhello' });
  assert.equal(hashSkillDir(dir), hashSkillDir(dir));
});

test('hash changes when file content changes', () => {
  const dir = mkSkill({ 'SKILL.md': 'a' });
  const h1 = hashSkillDir(dir);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), 'b');
  const h2 = hashSkillDir(dir);
  assert.notEqual(h1, h2);
});

test('hash changes when a file is added', () => {
  const dir = mkSkill({ 'SKILL.md': 'a' });
  const h1 = hashSkillDir(dir);
  fs.writeFileSync(path.join(dir, 'extra.md'), 'new');
  const h2 = hashSkillDir(dir);
  assert.notEqual(h1, h2);
});

test('hash is independent of filesystem enumeration order (sorted internally)', () => {
  const dir = mkSkill({ 'b.md': '1', 'a.md': '2', 'nested/c.md': '3' });
  const h1 = hashSkillDir(dir);
  const h2 = hashSkillDir(dir);
  assert.equal(h1, h2);
});

test('excludes .git, __pycache__, node_modules, .DS_Store from the hash', () => {
  const dir = mkSkill({ 'SKILL.md': 'a' });
  const h1 = hashSkillDir(dir);
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/main');
  fs.mkdirSync(path.join(dir, '__pycache__'), { recursive: true });
  fs.writeFileSync(path.join(dir, '__pycache__', 'x.pyc'), 'binary');
  fs.writeFileSync(path.join(dir, '.DS_Store'), 'junk');
  const h2 = hashSkillDir(dir);
  assert.equal(h1, h2, 'excluded paths must not affect the hash');
});

test('following a symlink to different content changes the hash', () => {
  if (process.platform === 'win32') return; // symlinks need elevated perms on Windows CI runners
  const dir = mkSkill({ 'SKILL.md': 'a' });
  const targetA = fs.mkdtempSync(path.join(os.tmpdir(), 'praetorix-target-a-'));
  fs.writeFileSync(path.join(targetA, 'payload.txt'), 'version-a');
  fs.symlinkSync(targetA, path.join(dir, 'linked'), 'dir');
  const h1 = hashSkillDir(dir);

  const targetB = fs.mkdtempSync(path.join(os.tmpdir(), 'praetorix-target-b-'));
  fs.writeFileSync(path.join(targetB, 'payload.txt'), 'version-b');
  fs.rmSync(path.join(dir, 'linked'));
  fs.symlinkSync(targetB, path.join(dir, 'linked'), 'dir');
  const h2 = hashSkillDir(dir);

  assert.notEqual(h1, h2, 'swapping a symlink target must invalidate the hash');
});

test('does not hang on a symlink cycle', () => {
  if (process.platform === 'win32') return;
  const dir = mkSkill({ 'SKILL.md': 'a' });
  fs.symlinkSync(dir, path.join(dir, 'self'), 'dir');
  assert.doesNotThrow(() => hashSkillDir(dir));
});
