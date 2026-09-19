# Security Policy

Praetorix is a security tool — its own trustworthiness matters more than usual. This document
says exactly what it defends against, what it doesn't, where to get it, and how to report a
problem with it.

## Reporting a Vulnerability

Use GitHub's private vulnerability reporting — it reaches the maintainer directly and doesn't
create a public issue while a report is unconfirmed:

- <https://github.com/JPF1111/praetorix/security/advisories/new>

Do **not** open a public GitHub issue for a security vulnerability.

Include:

- affected file/version/commit and how you installed Praetorix
- steps to reproduce from a clean install
- expected impact and which trust boundary it crosses (see Scope below)
- whether exploitation requires local shell access, a malicious skill, or something else
- any PoC logs with paths, tokens, or other private data redacted

Expected response: acknowledgment within 48 hours, an initial assessment within 7 days, and a
fix or mitigation target within 14 days for a report that reproduces and crosses a real trust
boundary. If a report is declined, you'll get a reason (not reproducible, out of scope, already
fixed, or needs a stronger attack path).

## Official Distribution Surfaces

- GitHub repository: <https://github.com/JPF1111/praetorix>
- Marketplace/plugin slug: `praetorix@praetorix`
- Documentation: <https://jpf1111.github.io/praetorix/>

There is no npm package, browser extension, or other channel today. **Treat anything claiming
to be Praetorix outside these surfaces as unofficial and untrusted** — there is no legitimate
reason for a fork or mirror of a security-gating tool to carry the same name without saying so
clearly and linking back here.

## Scope

Covered by this policy: this repository's own code (`src/`, `bin/`, `hooks/`), its plugin/
marketplace manifests, its CI workflows, and the vendored `skills/skill-inspector/SKILL.md`
(report a defect in the vendored *copy itself* — e.g. a change during vendoring — here; report a
defect in SkillSpector's own scanning logic to
[NVIDIA/skillspector](https://github.com/NVIDIA/skillspector/security)).

**Out of scope:** vulnerabilities in the SkillSpector CLI's own analysis engine, local command
execution where you already control the local shell and no higher-privilege boundary is
crossed, and reports against a fork or unofficial mirror rather than the surfaces listed above.

## What Praetorix Actually Defends Against — and What It Doesn't

Be precise about this rather than imply more than is true:

- **Defends against:** a skill that was never reviewed, or a previously-approved skill whose
  files changed since approval, running without your knowledge. The gate is fail-closed by
  construction — any internal error (a corrupt ledger, an unresolvable skill, an unexpected
  hook payload) denies, it does not silently allow.
- **Does not defend against:** an attacker who already has local code execution as you. The
  approval ledger (`~/.praetorix/ledger.json`) is a permission-locked (`0600`) plain JSON file —
  real protection against another user on a shared machine or a less-trusted process, but not
  against something already running with your own privileges. There is no cryptographic
  signing of ledger entries today.
- **Does not defend against:** a TOCTOU window between the hash check and Claude Code actually
  reading the skill's content after the hook returns `allow`. Closing this fully would require
  OS-level file locking across the entire load-and-execute sequence, which is outside a
  `PreToolUse` hook's control. Documented here rather than silently assumed away.

## Supply-Chain Rules (this repo's own CI)

- Every third-party GitHub Action is pinned to a full commit SHA with a version comment, never
  a floating tag.
- `claude plugin validate .` runs in CI on every push.
- The vendored `skill-inspector/SKILL.md`'s content hash is pinned in `src/trusted.js` and
  checked against the file on disk by the test suite (`test/trusted.test.js`) — if the vendored
  file and the hardcoded hash ever drift apart, CI fails loudly instead of silently trusting
  stale content.

## Operational Disclosure

- **Outbound network calls:** Praetorix itself makes none. `skillspector scan`, which Praetorix
  invokes, makes one when the scanned skill declares a dependency manifest — its SC4 check
  queries `api.osv.dev` for known vulnerable dependencies, even with `--no-llm`. This is
  SkillSpector's behavior, disclosed here because Praetorix triggers it.
- **What's written to disk:** `~/.praetorix/ledger.json` (the approval ledger) and
  `~/.praetorix/audit.log` (an append-only record of every gate decision). Both are
  `chmod 600`. Nothing is sent anywhere by Praetorix itself.
