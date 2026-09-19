// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/gate.js';

function baseEntry(overrides = {}) {
  return {
    key: 'x',
    skillName: 'x',
    invocationName: 'x',
    path: '/some/dir',
    hash: 'abc123',
    verdict: 'APPROVE',
    note: '',
    approvedBy: 'jp',
    recordedAt: new Date().toISOString(),
    scannerVersion: null,
    scan: { ran: true, score: 0, severity: 'LOW', recommendation: 'SAFE', analysisComplete: true },
    ...overrides,
  };
}

test('not_applicable resolution always allows', () => {
  const result = decide({
    resolution: { status: 'not_applicable', reason: 'bundled' },
    currentHash: null,
    ledgerEntry: null,
  });
  assert.equal(result.decision, 'allow');
  assert.equal(result.code, 'not_applicable');
});

test('resolve error always denies, even with no ledger involved', () => {
  const result = decide({
    resolution: { status: 'error', reason: 'plugin exists but skill layout unknown' },
    currentHash: null,
    ledgerEntry: null,
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.code, 'resolve_error');
});

test('found + hash failure denies fail-closed', () => {
  const result = decide({
    resolution: { status: 'found', dir: '/d' },
    currentHash: null,
    ledgerEntry: null,
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.code, 'hash_error');
});

test('found + hashed + no ledger entry denies (never scanned)', () => {
  const result = decide({
    resolution: { status: 'found', dir: '/d' },
    currentHash: 'abc123',
    ledgerEntry: null,
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.code, 'never_scanned');
});

test('found + hashed + ledger entry with mismatched hash denies (stale)', () => {
  const result = decide({
    resolution: { status: 'found', dir: '/d' },
    currentHash: 'DIFFERENT',
    ledgerEntry: baseEntry({ hash: 'abc123', verdict: 'APPROVE' }),
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.code, 'stale');
});

test('found + hashed + matching hash + REJECT verdict denies', () => {
  const result = decide({
    resolution: { status: 'found', dir: '/d' },
    currentHash: 'abc123',
    ledgerEntry: baseEntry({ hash: 'abc123', verdict: 'REJECT' }),
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.code, 'rejected');
});

test('found + hashed + matching hash + APPROVE verdict allows', () => {
  const result = decide({
    resolution: { status: 'found', dir: '/d' },
    currentHash: 'abc123',
    ledgerEntry: baseEntry({ hash: 'abc123', verdict: 'APPROVE' }),
  });
  assert.equal(result.decision, 'allow');
  assert.equal(result.code, 'approved');
});

test('found + hashed + matching hash + CAUTION verdict still allows', () => {
  const result = decide({
    resolution: { status: 'found', dir: '/d' },
    currentHash: 'abc123',
    ledgerEntry: baseEntry({ hash: 'abc123', verdict: 'CAUTION' }),
  });
  assert.equal(result.decision, 'allow');
  assert.equal(result.code, 'approved');
});

test('found + hashed + matching hash + unrecognized verdict denies fail-closed', () => {
  const result = decide({
    resolution: { status: 'found', dir: '/d' },
    currentHash: 'abc123',
    ledgerEntry: baseEntry({ hash: 'abc123', verdict: /** @type {any} */ ('SOMETHING_ELSE') }),
  });
  assert.equal(result.decision, 'deny');
});
