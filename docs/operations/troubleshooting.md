# Troubleshooting

## A skill I approved is still blocked

**Cause:** almost always a hash mismatch — something in the skill directory changed since the
last `praetorix approve` run, even something as small as a trailing newline.

**Solution:** `praetorix status <skill-name>` shows `STALE — content changed since approval` when
this is the cause. Re-run `praetorix approve` with a fresh review.

## Hook doesn't seem to fire after installing or updating the plugin

**Cause:** Claude Code loads plugin hook configuration when a session starts, not live. A
plugin installed or updated mid-session doesn't take effect in that same session.

**Solution:** run `/hooks` once (it reloads config) or restart the session.

## `praetorix: command not found`

**Cause:** the plugin's `bin/praetorix.js` isn't on `PATH` outside of what Claude Code itself
invokes internally.

**Solution:** find the installed plugin's directory (`claude plugin details praetorix` after
installing) and run `node <that path>/bin/praetorix.js ...` directly, or add it to your shell's
`PATH`.

## `skillspector: command not found` when approving

**Cause:** the SkillSpector CLI isn't installed, or isn't on `PATH`/`~/.local/bin`.

**Solution:** `uv tool install git+https://github.com/NVIDIA/skillspector.git`. Confirm with
`praetorix doctor`.

## A brand-new plugin's skills are all blocked

**Expected, not a bug.** Nothing is approved by default. Review and approve each skill you
actually intend to use, or deliberately leave an untrusted plugin's skills unapproved.

## I want a clean slate

`~/.praetorix/ledger.json` is plain JSON — delete it (or hand-edit a single entry) and
re-approve what you need. `~/.praetorix/audit.log` is independent history; deleting the ledger
doesn't touch it.
