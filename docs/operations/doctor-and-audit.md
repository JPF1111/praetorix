# Doctor and audit

## `praetorix doctor`

Run this first whenever something seems wrong. It checks three things, each independently:

```
[OK   ] skillspector CLI: /Users/you/.local/bin/skillspector
[OK   ] data directory: /Users/you/.praetorix
[OK   ] ledger: 12 entries, valid JSON
```

- **`skillspector CLI`** — `ERROR` means `praetorix approve` will fail until you install it
  (`uv tool install git+https://github.com/NVIDIA/skillspector.git`) or you deliberately pass
  `--skip-scan`.
- **`data directory`** — `ERROR` here means the gate itself can't write the ledger or audit
  log; nothing will ever get approved until this is fixed.
- **`ledger`** — `WARN` on a fresh install (no ledger yet) is normal. `ERROR` means
  `~/.praetorix/ledger.json` exists but isn't valid JSON — every skill will be denied as
  "never scanned" until it's fixed or removed (removing it loses all approval history, so fix
  it by hand if you can before deleting it).

Exits non-zero if any check is `ERROR` — safe to use in a script.

## `praetorix audit`

Every gate decision — allow or deny — is appended to `~/.praetorix/audit.log` before the hook
returns, independent of whether anything was ever approved. Use this to answer "what actually
happened" after the fact, not just "what's approved right now":

```bash
praetorix audit --limit 50
```

Each line: timestamp, decision, invocation name, and the exact reason the gate recorded at that
moment. The log rotates at 5 MiB (`audit.log.1`) rather than growing unbounded.
