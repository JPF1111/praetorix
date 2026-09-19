# First scan and approval

A real deny → review → approve → allow cycle, start to finish.

## 1. Try an unapproved skill

Invoke any skill Praetorix hasn't seen before. It's blocked:

```
✗ praetorix: 'my-new-skill' has never been scanned/approved.
```

## 2. Review it

Ask:

> "Is this skill safe to install: `<path-or-repo-url>`"

This fires the bundled `skill-inspector` skill, which runs `skillspector scan --no-llm` and then
reads the source itself, reporting `APPROVE` / `CAUTION` / `REJECT` with evidence — not just a
number. See [Trust model](../architecture/trust-model.md#skillspector-scores-are-risk-posture-not-a-verdict)
for why the raw score alone isn't enough.

## 3. Approve it

```bash
praetorix approve "<resolved skill dir>" --verdict APPROVE --note "why — cite what was checked"
```

This re-runs the scan (unless you pass `--skip-scan`, which is logged loudly — see
[CLI reference](../reference/cli.md#praetorix-approve)) and records the verdict, the skill's
exact content hash, and the scanner's own findings into `~/.praetorix/ledger.json`.

## 4. It runs

The same skill invocation now succeeds. Check on it any time:

```bash
praetorix status my-new-skill
```

## 5. Edit the skill, then try again

Change anything in the skill's files and invoke it again — it's blocked again, this time with a
different reason:

```
✗ praetorix: 'my-new-skill' changed since its last scan (content hash mismatch) —
  its prior 'APPROVE' verdict no longer applies.
```

That's the whole model: approval is bound to bytes, not to a name. Re-approving after a real
change is the same `praetorix approve` command — there's no separate "invalidate" step to
remember.
