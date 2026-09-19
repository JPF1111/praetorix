# Install

## Prerequisite: the SkillSpector CLI

Praetorix invokes `skillspector` — it doesn't bundle a scanner of its own.

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

No API key or LLM provider is required. Praetorix always runs `skillspector scan --no-llm` —
static analysis only. See [Trust model](../architecture/trust-model.md) for what that trades
off.

## Claude Code

```
/plugin marketplace add JPF1111/praetorix
/plugin install praetorix
```

That's it — the `PreToolUse` hook wires itself in automatically as part of the plugin install.
No manual `settings.json` editing.

If you install or update Praetorix in a session that's already running, run `/hooks` once (or
restart the session) to pick up the change — Claude Code loads plugin hook configuration at
session start, not live.

## Verify it's working

```bash
praetorix doctor
```

reports on the three things that matter for a working install: whether `skillspector` is on
`PATH`, whether Praetorix's data directory (`~/.praetorix/`) is writable, and whether the ledger
(if one exists yet) is valid JSON. A fresh install with no ledger yet is expected to show
`WARN` on the ledger check, not `OK` — that's normal, not a problem.

## Next

[First scan and approval](first-approval.md) walks through a real deny → approve → allow cycle.
