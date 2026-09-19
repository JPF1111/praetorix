# Contributing to Praetorix

## Before you start

1. **Open an issue first** for anything beyond a trivial fix — describe the bug or the change
   you want to make.
2. Fork the repo and branch from `main`.

## Making a change

- Runtime dependencies: none by design — Node.js built-ins only (`fs`, `path`, `crypto`,
  `child_process`, `os`). Keep it that way unless there's a strong reason not to; it's a
  deliberate simplicity/attack-surface choice, not an oversight.
- Run the test suite: `npm test` (`node --test`).
- If you touch `src/resolve.js` or `src/gate.js`, add a test in `test/` for the new behavior —
  these two files are the entire security-relevant decision surface, and the existing test
  files are written to cover the full decision matrix deliberately. A change that isn't
  represented in the tests is a change nobody can verify later.
- If you edit `skills/skill-inspector/SKILL.md`: don't, unless you're deliberately updating
  the vendored copy — see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the exact
  procedure (it requires recomputing and updating the hardcoded hash in `src/trusted.js` in the
  same commit, or the bootstrap-trust test fails on purpose).
- `claude plugin validate .` should pass before you open a PR (CI runs it too, but catching it
  locally is faster).

## Commit / PR

- Conventional Commits style (`fix:`, `feat:`, `docs:`, `chore:`) is preferred but not
  mechanically enforced.
- Explain *why*, not just what, when the change isn't self-evident from the diff.
- CI (tests + `claude plugin validate`) must be green before merge.

## Reporting a security issue

Not here — see [`SECURITY.md`](SECURITY.md). Don't open a public issue for a vulnerability.
