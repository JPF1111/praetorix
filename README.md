<p align="center">
  <img src="assets/icon.svg" alt="Praetorix" width="96" height="96" />
</p>

<h1 align="center">Praetorix</h1>

<p align="center"><strong>Nothing executes ungoverned.</strong></p>

<p align="center">
  <a href="https://github.com/JPF1111/praetorix/actions/workflows/ci.yml"><img src="https://github.com/JPF1111/praetorix/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node >=18" /></a>
  <a href="https://jpf1111.github.io/praetorix/"><img src="https://img.shields.io/badge/docs-jpf1111.github.io%2Fpraetorix-0F172A" alt="Documentation" /></a>
</p>

> [!WARNING]
> **Official sources only.** The only real distribution of Praetorix is this repository
> (`github.com/JPF1111/praetorix`) and the marketplace slug `praetorix@praetorix`. If you
> found this under a different name, a different GitHub account, or bundled inside something
> else, treat it as untrusted — it isn't us, and there is no legitimate reason to fork the name
> of a security tool. See [`SECURITY.md`](SECURITY.md).

Praetorix is a mandatory pre-execution security gate for [Claude Code](https://claude.com/claude-code)
Skills. It hooks `PreToolUse` on the `Skill` tool and blocks every invocation unless the skill
has been scanned by [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector), reviewed, and
approved into a content-hash-keyed ledger — and it re-blocks the instant the skill's files
change. Skills are just files; anyone can publish one, and a session invokes them with the same
trust it gives its own tools.
[SkillSpector's own research](https://github.com/NVIDIA/skillspector#overview) found
vulnerabilities in **26.1%** of a large sample of published skills, and likely-malicious intent
in **5.2%**.

```
$ claude
> [an unapproved skill tries to run]
✗ praetorix: 'shady-skill' has never been scanned/approved.
```

## Why

| Without a gate | With Praetorix |
|---|---|
| A skill runs the moment it's installed, unread. | Nothing runs until it's been scanned and someone has actually approved it. |
| "I scanned it once" is unverifiable and easily stale. | Approval is bound to the skill's exact content hash — any edit invalidates it automatically. |
| A scanner you have to remember to run by hand. | Enforcement is structural: the `Skill` tool itself won't fire without a passing gate check. |
| One bad interpreter dependency away from silently doing nothing. | A single Node.js runtime, fail-closed by construction — see [Architecture](https://jpf1111.github.io/praetorix/architecture/). |
| A raw scanner score with no interpretation. | Two independent review lines — SkillSpector's static evidence *and* Claude's own source-aware read — before a verdict is recorded. |

## Install

**Prerequisite** — the SkillSpector CLI:

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

**Claude Code:**

```
/plugin marketplace add JPF1111/praetorix
/plugin install praetorix
```

The hook wires itself in automatically — no manual `settings.json` editing. Run `/hooks` once
(or restart) to pick it up in an already-running session.

## Usage

**Review a skill:**

> "Is this skill safe to install: `<path-or-repo-url>`"

fires the bundled `skill-inspector` skill — SkillSpector's own companion review skill — which
runs the static scan, reads the source itself, and reports `APPROVE` / `CAUTION` / `REJECT` with
evidence. Reviewing a skill does not by itself unblock it; approving is a separate step.

**Approve a skill so it can run:**

```bash
praetorix approve "<resolved skill dir>" --verdict APPROVE --note "why — cite what was checked"
```

**Check status, list everything, or diagnose a broken install:**

```bash
praetorix status <skill-name>
praetorix list
praetorix doctor
```

Full reference: [jpf1111.github.io/praetorix/reference/](https://jpf1111.github.io/praetorix/reference/).

## What this does not do

Read this before you trust it with anything that matters:

- **This defends against a malicious *skill*, not an attacker who already has local code
  execution as you.** The approval ledger is a plain, permission-locked JSON file — real
  protection against a stray process or another user on a shared machine, not against someone
  who can already run arbitrary code in your session.
- **A `skillspector` score is risk posture, not a verdict.** Static keyword-matching scanners
  produce real false positives on documentation-heavy skills — confirmed during this project's
  own testing, where several entirely benign reference-doc skills scored `CRITICAL` purely from
  words like `.env` or `credentials.json` appearing in prose. Read what actually triggered a
  finding before trusting the number.
- **SkillSpector makes an outbound network call.** Even with `--no-llm`, its dependency-vulnerability
  check (SC4) queries `api.osv.dev` on every scan of a skill with a dependency manifest. Nothing
  in Praetorix itself phones home; this is disclosed because SkillSpector does.
- **Claude Code's own bundled skills and skills synced from your claude.ai account are out of
  scope by design** — there's no directory Praetorix controls to hash for either. See
  [Architecture](https://jpf1111.github.io/praetorix/architecture/) for the full scope
  boundary and why.

## License

Apache-2.0 for this project's own code — see [`LICENSE`](LICENSE). One vendored third-party
file (`skills/skill-inspector/SKILL.md`, from NVIDIA's SkillSpector, also Apache-2.0) is
documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Praetorix is not affiliated
with or endorsed by NVIDIA.

## Credits

Built on [NVIDIA/skillspector](https://github.com/NVIDIA/skillspector), part of the NVIDIA
Verified Skills pipeline.
