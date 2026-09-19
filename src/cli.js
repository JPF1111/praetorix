// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { resolveSkill } from './resolve.js';
import { hashSkillDir } from './hash.js';
import { loadLedger, saveLedger, ledgerExists, ledgerKey } from './ledger.js';
import { runScan, findSkillspectorBin } from './scan.js';
import { readRecentAuditEntries } from './audit.js';
import { ledgerPath, praetorixHome } from './paths.js';

const VALID_VERDICTS = ['APPROVE', 'CAUTION', 'REJECT'];

/**
 * @param {string[]} argv
 */
export async function runCli(argv) {
  const [cmd, ...rest] = argv;

  switch (cmd) {
    case 'approve':
      return cmdApprove(rest);
    case 'reject':
      return cmdReject(rest);
    case 'status':
      return cmdStatus(rest);
    case 'list':
      return cmdList(rest);
    case 'doctor':
      return cmdDoctor(rest);
    case 'audit':
      return cmdAudit(rest);
    case undefined:
    case '--help':
    case '-h':
    case 'help':
      printHelp();
      return 0;
    default:
      process.stderr.write(`praetorix: unknown command '${cmd}'\n\n`);
      printHelp();
      return 1;
  }
}

function printHelp() {
  process.stdout.write(`praetorix — the elite execution gate for AI agent skills

Usage:
  praetorix approve <dir> --verdict APPROVE|CAUTION|REJECT --note "..."  Scan + record a verdict
  praetorix reject  <dir> --note "..."                                  Shorthand for approve --verdict REJECT
  praetorix status  <skill-name> [--cwd <dir>]                          Show a skill's current ledger status
  praetorix list                                                        List every ledger entry
  praetorix doctor                                                      Health-check the install
  praetorix audit [--limit N]                                           Show recent gate decisions

Flags on approve/reject:
  --skip-scan             Record a verdict without running skillspector (logged loudly; use sparingly)
  --name <name>            Override the display name recorded in the ledger
  --approved-by <who>       Override the recorded approver (defaults to $USER)
`);
}

/** @param {string[]} args */
function parseFlags(args) {
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  /** @type {string[]} */
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

/** @param {string[]} args */
async function cmdApprove(args) {
  const { flags, positional } = parseFlags(args);
  const dirArg = positional[0];
  if (!dirArg) {
    process.stderr.write('praetorix approve: missing <dir>\n');
    return 1;
  }
  const verdict = String(flags.verdict || '');
  if (!VALID_VERDICTS.includes(verdict)) {
    process.stderr.write(`praetorix approve: --verdict must be one of ${VALID_VERDICTS.join(', ')}\n`);
    return 1;
  }

  const dir = fs.realpathSync(path.resolve(dirArg));
  if (!fs.statSync(dir).isDirectory()) {
    process.stderr.write(`praetorix approve: not a directory: ${dir}\n`);
    return 1;
  }

  const name = typeof flags.name === 'string' ? flags.name : path.basename(dir);
  const note = typeof flags.note === 'string' ? flags.note : '';
  const approvedBy = typeof flags['approved-by'] === 'string' ? flags['approved-by'] : process.env.USER || process.env.USERNAME || 'unknown';
  const skipScan = flags['skip-scan'] === true;

  const hash = hashSkillDir(dir);

  /** @type {import('./ledger.js').LedgerEntry['scan']} */
  let scanInfo = { ran: false, score: null, severity: null, recommendation: null, analysisComplete: null };
  let scannerVersion = null;

  if (skipScan) {
    process.stderr.write(
      `praetorix approve: --skip-scan given — recording '${verdict}' for ${dir} with NO scanner evidence. ` +
        `This is logged; do not use this to route around a scan you don't want to see the results of.\n`,
    );
  } else {
    const bin = findSkillspectorBin();
    if (!bin) {
      process.stderr.write(
        "praetorix approve: 'skillspector' is not installed. Install it (uv tool install " +
          'git+https://github.com/NVIDIA/skillspector.git) or pass --skip-scan to record without a scan.\n',
      );
      return 1;
    }
    const result = runScan(dir);
    if (!result.ok) {
      process.stderr.write(`praetorix approve: scan failed: ${result.error}\n`);
      return 1;
    }
    scanInfo = {
      ran: true,
      score: result.score,
      severity: result.severity,
      recommendation: result.recommendation,
      analysisComplete: result.analysisComplete,
    };
    scannerVersion = result.scannerVersion;

    if (result.analysisComplete === false && verdict === 'APPROVE') {
      process.stderr.write(
        'praetorix approve: the scan reported incomplete analysis coverage — recording APPROVE anyway ' +
          'because you asked for it, but consider CAUTION instead. A truncated scan is not proof of a clean skill.\n',
      );
    }
  }

  const ledger = ledgerExists() ? loadLedger() : {};
  ledger[ledgerKey(name)] = {
    key: ledgerKey(name),
    skillName: path.basename(dir),
    invocationName: name,
    path: dir,
    hash,
    verdict: /** @type {any} */ (verdict),
    note,
    approvedBy,
    recordedAt: new Date().toISOString(),
    scannerVersion,
    scan: scanInfo,
  };
  saveLedger(ledger);

  process.stdout.write(`Recorded ${verdict} for '${name}' (${dir})\n`);
  process.stdout.write(`  hash: ${hash.slice(0, 16)}…\n`);
  process.stdout.write(`  ledger: ${ledgerPath()}\n`);
  return 0;
}

/** @param {string[]} args */
async function cmdReject(args) {
  return cmdApprove([...args, '--verdict', 'REJECT']);
}

/** @param {string[]} args */
async function cmdStatus(args) {
  const { flags, positional } = parseFlags(args);
  const name = positional[0];
  if (!name) {
    process.stderr.write('praetorix status: missing <skill-name>\n');
    return 1;
  }
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : process.cwd();

  const resolution = resolveSkill(name, cwd);
  process.stdout.write(`skill:      ${name}\n`);
  process.stdout.write(`resolution: ${resolution.status}\n`);

  if (resolution.status !== 'found') {
    process.stdout.write(`reason:     ${resolution.reason}\n`);
    return 0;
  }

  process.stdout.write(`path:       ${resolution.dir}\n`);
  const currentHash = hashSkillDir(resolution.dir);
  process.stdout.write(`hash:       ${currentHash}\n`);

  if (!ledgerExists()) {
    process.stdout.write('status:     NEVER SCANNED (no ledger yet)\n');
    return 0;
  }
  const ledger = loadLedger();
  const entry = ledger[ledgerKey(name)];
  if (!entry) {
    process.stdout.write('status:     NEVER SCANNED\n');
    return 0;
  }

  process.stdout.write(`verdict:    ${entry.verdict}\n`);
  process.stdout.write(`approved by: ${entry.approvedBy} at ${entry.recordedAt}\n`);
  process.stdout.write(`note:       ${entry.note}\n`);
  process.stdout.write(
    entry.hash === currentHash ? 'status:     CURRENT — matches ledger\n' : 'status:     STALE — content changed since approval\n',
  );
  return 0;
}

/** @param {string[]} _args */
async function cmdList(_args) {
  if (!ledgerExists()) {
    process.stdout.write('No ledger yet — nothing has been scanned.\n');
    return 0;
  }
  const ledger = loadLedger();
  const entries = Object.values(ledger);
  if (entries.length === 0) {
    process.stdout.write('Ledger is empty.\n');
    return 0;
  }
  entries.sort((a, b) => a.invocationName.localeCompare(b.invocationName));
  for (const e of entries) {
    process.stdout.write(`${pad(e.verdict, 8)} ${pad(String(e.scan.score ?? '-'), 5)} ${e.invocationName}\n`);
  }
  return 0;
}

/** @param {string[]} args */
async function cmdAudit(args) {
  const { flags } = parseFlags(args);
  const limit = typeof flags.limit === 'string' ? parseInt(flags.limit, 10) : 20;
  const entries = readRecentAuditEntries(limit);
  if (entries.length === 0) {
    process.stdout.write('No audit entries yet.\n');
    return 0;
  }
  for (const e of entries) {
    process.stdout.write(`${e.ts}  ${pad(e.decision, 5)}  ${e.invocationName}  ${e.reason}\n`);
  }
  return 0;
}

/** @param {string[]} _args */
async function cmdDoctor(_args) {
  /** @type {Array<{ name: string, status: 'ok' | 'warn' | 'error', detail: string }>} */
  const checks = [];

  const bin = findSkillspectorBin();
  checks.push(
    bin
      ? { name: 'skillspector CLI', status: 'ok', detail: bin }
      : {
          name: 'skillspector CLI',
          status: 'error',
          detail: 'not found on PATH or ~/.local/bin — install with: uv tool install git+https://github.com/NVIDIA/skillspector.git',
        },
  );

  const home = praetorixHome();
  try {
    fs.mkdirSync(home, { recursive: true, mode: 0o700 });
    fs.accessSync(home, fs.constants.W_OK);
    checks.push({ name: 'data directory', status: 'ok', detail: home });
  } catch (err) {
    checks.push({ name: 'data directory', status: 'error', detail: `${home} is not writable: ${errMsg(err)}` });
  }

  if (ledgerExists()) {
    try {
      const ledger = loadLedger();
      checks.push({ name: 'ledger', status: 'ok', detail: `${Object.keys(ledger).length} entries, valid JSON` });
    } catch (err) {
      checks.push({ name: 'ledger', status: 'error', detail: `${ledgerPath()} is not valid JSON: ${errMsg(err)}` });
    }
  } else {
    checks.push({ name: 'ledger', status: 'warn', detail: 'no ledger yet — nothing has been approved' });
  }

  let anyError = false;
  for (const c of checks) {
    if (c.status === 'error') anyError = true;
    const label = c.status === 'ok' ? 'OK   ' : c.status === 'warn' ? 'WARN ' : 'ERROR';
    process.stdout.write(`[${label}] ${c.name}: ${c.detail}\n`);
  }
  return anyError ? 1 : 0;
}

/** @param {string} s @param {number} n */
function pad(s, n) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

/** @param {unknown} err */
function errMsg(err) {
  return err instanceof Error ? err.message : String(err);
}
