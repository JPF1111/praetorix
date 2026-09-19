// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSkillDir } from '../src/hash.js';
import { checkTrusted, TRUSTED_ENTRIES } from '../src/trusted.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillInspectorDir = path.join(__dirname, '..', 'skills', 'skill-inspector');

test('the hardcoded trusted hash for skill-inspector matches the vendored file on disk', () => {
  const actual = hashSkillDir(skillInspectorDir);
  const entry = TRUSTED_ENTRIES.find((e) => e.invocationName === 'praetorix:skill-inspector');
  assert.ok(entry, 'expected a trusted entry for praetorix:skill-inspector');
  assert.equal(
    actual,
    entry.hash,
    'the vendored skill-inspector/SKILL.md changed without updating src/trusted.js — recompute and update the hardcoded hash deliberately',
  );
});

test('checkTrusted only matches on exact name AND hash, not either alone', () => {
  const realHash = hashSkillDir(skillInspectorDir);
  assert.equal(checkTrusted('praetorix:skill-inspector', realHash), TRUSTED_ENTRIES[0].reason);
  assert.equal(checkTrusted('praetorix:skill-inspector', 'wrong-hash'), null);
  assert.equal(checkTrusted('some-other-skill', realHash), null);
});
