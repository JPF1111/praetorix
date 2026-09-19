# Changelog

## 0.1.0 — 2026-09-19

Initial release. A ground-up rewrite of an earlier same-day proof of concept
(`skillspector-gate`), rebuilt after a two-pass research audit surfaced real defects in that
version and a survey of NVIDIA SkillSpector's actual capabilities, `everything-claude-code`,
and gitleaks/trufflehog/trivy informed the redesign.

### Added

- Full Node.js/TypeScript-style (JSDoc, no build step) rewrite of the gate: `src/resolve.js`,
  `src/hash.js`, `src/gate.js`, `src/ledger.js`, `src/audit.js`, `src/scan.js`,
  `src/hook-entry.js`. Single runtime, no shelled-out interpreter that can silently vanish.
- Three-state skill resolution (`found` / `not_applicable` / `error`) replacing a two-state
  found/not-found model — an unresolvable `plugin:skill` name now denies instead of silently
  allowing. This is a direct fix for an empirically-confirmed bypass in the prior
  implementation (a plugin skill exposed with no `SKILL.md` resolved to nothing and was
  allowed through).
- A real CLI: `praetorix approve|reject|status|list|doctor|audit`, replacing a single
  `approve.py` script.
- An append-only audit log (`~/.praetorix/audit.log`) recording every gate decision with its
  reason.
- Ledger entries keyed by stable logical identity (invocation name) instead of a
  version-stamped install path, so a plugin update no longer turns a real prior approval into
  a false "never scanned."
- Symlink-following, cycle-bounded content hashing with an explicit exclusion list
  (`.git`, `__pycache__`, `node_modules`, editor artifacts) — closes both a hashing integrity
  gap (a symlink target swap previously didn't change the hash) and a false-positive source
  (VCS/cache directories previously did).
- A hardcoded, hash-and-name-matched trust entry for the vendored `skill-inspector` review
  skill, closing the bootstrap paradox (the gate could previously block the very skill its own
  deny message told you to use).
- 25 unit tests (`node --test`) covering the full resolver branch set and gate decision matrix,
  including a regression test for the bypass above and a test that the hardcoded trust hash
  actually matches the vendored file on disk.
- `SECURITY.md`, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`, an MkDocs Material documentation
  site, and a project icon.

### Changed from the prior proof of concept

- Ledger and audit log now live in `~/.praetorix/` (was `~/.claude/skillspector/`), honoring
  Claude Code's own `CLAUDE_CONFIG_DIR` override where relevant instead of hardcoding
  `~/.claude`.
- `--skip-scan` is now loud (prints a warning explaining what it's forgoing) rather than a
  quiet flag.
