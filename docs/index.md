# Praetorix

**Nothing executes ungoverned.**

Praetorix is a mandatory pre-execution security gate for [Claude Code](https://claude.com/claude-code)
Skills. It hooks `PreToolUse` on the `Skill` tool and blocks every invocation unless the skill
has been scanned by [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector), reviewed, and
approved into a content-hash-keyed ledger — and it re-blocks the instant the skill's files
change.

Start with [Install](getting-started/install.md), or read [Pipeline](architecture/pipeline.md)
first if you want to understand the mechanism before installing it.

## Why

Skills are just files. Anyone can publish one, and a session invokes them with the same trust
it gives its own tools.
[SkillSpector's own research](https://github.com/NVIDIA/skillspector#overview) found
vulnerabilities in 26.1% of a large sample of published skills, and likely-malicious intent in
5.2%. Praetorix turns "you should scan skills before installing them" into "skills that haven't
been scanned and approved simply don't run."

## Read this before you trust it

- [Trust model](architecture/trust-model.md) — what Praetorix actually defends against, stated
  plainly, including what it doesn't.
- [Security](security/index.md) — official distribution surfaces, vulnerability reporting,
  operational disclosures (including a real outbound network call SkillSpector itself makes).
