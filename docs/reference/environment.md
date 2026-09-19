# Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PRAETORIX_HOME` | `~/.praetorix` | Where the ledger (`ledger.json`) and audit log (`audit.log`) live. Override for testing or a non-standard data location. |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Honored, not hardcoded — Claude Code's own config-relocation override. Determines where the resolver looks for `skills/` and `plugins/installed_plugins.json`. |

Both are read fresh on every invocation, not cached — safe to set per-command or per-session.
