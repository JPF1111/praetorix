# Trust model

## The full gate decision matrix

| Resolution | Hash | Ledger entry | Decision |
|---|---|---|---|
| `not_applicable` | — | — | **Allow** — out of scope by design |
| `error` | — | — | **Deny** — should have resolved, didn't |
| `found` | fails | — | **Deny** — fail-closed |
| `found` | ok | none | **Deny** — never scanned |
| `found` | ok | hash mismatch | **Deny** — stale, content changed |
| `found` | ok | matches, verdict `REJECT` | **Deny** |
| `found` | ok | matches, verdict `APPROVE`/`CAUTION` | **Allow** |
| `found` | ok | matches, unrecognized verdict | **Deny** — fail-closed |

Every row is an explicit branch in `src/gate.js` and has a dedicated test in
[`test/gate.test.js`](https://github.com/JPF1111/praetorix/blob/main/test/gate.test.js). There
is no fallback-to-allow anywhere in this table.

## What this defends against

A skill that was never reviewed, or a previously-approved skill whose files changed since
approval, running without your knowledge or an explicit decision.

## What this does not defend against — stated plainly

- **An attacker who already has local code execution as you.** The ledger
  (`~/.praetorix/ledger.json`) is a permission-locked (`chmod 600`) plain JSON file. That's real
  protection against another user on a shared machine or a less-trusted process — it is not
  cryptographically signed, and nothing local-JSON-based can defend against someone already
  running arbitrary code in your own session. If you need that guarantee, it has to come from
  somewhere else in your security stack, not from Praetorix.
- **A TOCTOU window between the hash check and execution.** The hash is computed at
  `PreToolUse` time — the moment right before Claude Code would run the skill. There is a
  narrow window between that check returning `allow` and Claude Code actually reading and
  executing the skill's content where a sufficiently fast, already-running local attacker could
  modify the files. Closing this fully would require OS-level file locking across the entire
  load-and-execute sequence, which is outside what a `PreToolUse` hook can control. This is a
  real, narrow, low-likelihood limitation — documented rather than silently assumed away.

## Hashing is byte-exact on purpose

`src/hash.js` hashes raw file bytes — it does not normalize line endings, whitespace, or
encoding. Two files that differ only by CRLF vs. LF hash differently and are treated as
different content, on purpose: silently normalizing away *any* byte-level difference before
hashing would mean two skills with genuinely different content could hash identically, which
defeats the point of content-hash pinning. If you distribute or edit skills across both Windows
and macOS/Linux, make sure your own editor and VCS settings keep line endings consistent — this
repository's own vendored content does so via [`.gitattributes`](https://github.com/JPF1111/praetorix/blob/main/.gitattributes),
forcing LF on checkout regardless of platform, which is what CI's cross-platform test matrix
caught and fixed before 0.1.0 shipped.

## SkillSpector scores are risk posture, not a verdict

Static keyword-matching scanners produce real false positives on documentation-heavy skills.
Confirmed directly during this project's own testing: several entirely benign reference-doc
skills scored `CRITICAL`/100 purely from words like `.env` or `credentials.json` appearing in
prose — troubleshooting guides, API endpoint listings, `.gitignore` templates — not in
executable code. A high score is a prompt to go read what actually triggered the finding, not a
verdict by itself. This is exactly what the two-independent-review-lines design (static
evidence *and* a source-aware read) in the bundled `skill-inspector` skill is for.

## Scope: what's gated, what isn't

**Gated** — must be in the ledger with a matching hash to run: everything under
`~/.claude/skills/` (except `synced/`), project-level `.claude/skills/` in the current repo or
any parent directory, and skills inside any plugin listed in `installed_plugins.json`.

**Not gated, by design:** Claude Code's own bundled/built-in skills (no on-disk directory
Praetorix controls to hash), and skills synced from your claude.ai account under
`~/.claude/skills/synced/` — first-party content delivered through an authenticated account
channel, treated at the same trust tier as the CLI itself. See
[Pipeline](pipeline.md#1-resolve) for exactly how the resolver distinguishes these from a
genuine resolution failure.

Praetorix controls *execution*, not *installation*. Copying a new skill's files into
`~/.claude/skills/` is unrestricted; the block only fires the moment something tries to run it.
