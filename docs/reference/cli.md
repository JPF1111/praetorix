# CLI reference

## `praetorix approve`

```bash
praetorix approve <dir> --verdict APPROVE|CAUTION|REJECT [--note "..."] [--name <name>] [--approved-by <who>] [--skip-scan]
```

Hashes `<dir>`, runs `skillspector scan --no-llm --format json` against it (unless
`--skip-scan`), and records an entry in `~/.praetorix/ledger.json` keyed by `--name` (defaults
to the directory's basename — pass the real invocation name, e.g. `my-plugin:my-skill`, for
plugin-sourced skills).

- `--verdict` is required, one of `APPROVE`, `CAUTION`, `REJECT`. `CAUTION` still **allows** the
  skill to run — it's a note that something wasn't fully hand-verified, not a soft block.
- `--skip-scan` records a verdict with no scanner evidence. This prints a warning to stderr
  every time — it's meant for genuine exceptions, not a routine flag.
- `--approved-by` defaults to `$USER` (or `$USERNAME` on Windows).

## `praetorix reject`

```bash
praetorix reject <dir> [--note "..."]
```

Shorthand for `praetorix approve <dir> --verdict REJECT`.

## `praetorix status`

```bash
praetorix status <skill-name> [--cwd <dir>]
```

Resolves `<skill-name>` exactly the way the gate hook would, from `--cwd` (defaults to the
current directory), and prints its resolution, current hash, and ledger status (never scanned /
current / stale).

## `praetorix list`

```bash
praetorix list
```

Prints every ledger entry: verdict, SkillSpector score, invocation name.

## `praetorix doctor`

```bash
praetorix doctor
```

Health-checks the install: is `skillspector` on `PATH` or at `~/.local/bin/skillspector`, is
`~/.praetorix/` writable, is the ledger (if one exists) valid JSON. Exits non-zero if any check
is `ERROR`.

## `praetorix audit`

```bash
praetorix audit [--limit N]
```

Prints the last `N` (default 20) gate decisions from `~/.praetorix/audit.log` — timestamp,
decision, skill, and the reason recorded at the time.
