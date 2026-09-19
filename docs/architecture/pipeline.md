# Pipeline

`PreToolUse` on the `Skill` tool receives only `{"skill": "<name>", "args": "..."}` and the
session's `cwd` — no resolved directory path. Praetorix's `src/hook-entry.js` builds the rest of
the decision from there, in one Node.js process, with no shelled-out interpreter in the path
(the previous bash+python3 implementation's most serious defect was failing *open* whenever
python3 happened to be missing).

```
skill name ─▶ resolve ─▶ hash ─▶ trusted? ─▶ ledger lookup ─▶ allow / deny
```

## 1. Resolve

`src/resolve.js` turns a skill name into a real, symlink-resolved directory — or a definitive
answer that there isn't one. This returns one of **three** states, not two:

- **`found`** — a real directory. Proceed to hashing.
- **`not_applicable`** — confidently out of scope: a bare name (no `plugin:` prefix) found
  nowhere under `~/.claude/skills/` or any project `.claude/skills/`. Claude Code's own bundled
  skills and claude.ai-synced skills are always invoked by bare name, so this is where they
  land — **allow**, there's nothing here for Praetorix to control.
- **`error`** — a `plugin:skill`-form name where resolution failed for *any* reason: the plugin
  isn't in `installed_plugins.json` at all, or it is but the named skill isn't in any
  conventional location within it. **Deny.**

The `not_applicable` vs. `error` split is what closes a real, previously-exploitable gap: the
prior implementation treated *any* resolution failure as "nothing to gate," which meant a
plugin skill exposed through a layout the resolver didn't recognize was silently allowed
through. Since third-party plugin skills are always invoked in `plugin:skill` form, an
unresolvable name in that form is never treated as out-of-scope — it's treated as "we should
have been able to find this and didn't," which denies.

## 2. Hash

`src/hash.js` computes a SHA-256 over every file's relative path and content, sorted, hashed
together — order-independent, and it changes on any add, remove, rename, or edit. Symlinks are
followed (with a bounded depth against cycles), so swapping a symlink's target inside a skill
directory invalidates the hash too. A short, explicit exclusion list (`.git`, `__pycache__`,
`node_modules`, editor artifacts) keeps VCS/cache noise from producing false "changed" results.

## 3. Trusted (bootstrap exception)

Exactly one hardcoded entry, in `src/trusted.js`: the vendored `skill-inspector` review skill
this plugin ships, matched by **both** invocation name and exact content hash. Without this,
the gate would block the very skill its own deny messages tell you to run in order to unblock
anything else, on a machine with an empty ledger. If the vendored file is ever edited, this
hash goes stale and the entry simply stops matching — the test suite catches that (see
[`THIRD_PARTY_NOTICES.md`](https://github.com/JPF1111/praetorix/blob/main/THIRD_PARTY_NOTICES.md)).

## 4. Ledger lookup

`src/ledger.js` reads `~/.praetorix/ledger.json`, keyed by the skill's **invocation name** —
not its resolved install path, which is version-stamped for plugin-sourced skills and changes
on every plugin update. Keying by logical identity means a plugin upgrade alone doesn't turn a
real prior approval into a false "never scanned"; a content-hash change still does.

## 5. Decide

`src/gate.js` is a pure function — no I/O — over `{resolution, currentHash, ledgerEntry}`. Every
branch is enumerated explicitly; there is no "if in doubt, allow" path anywhere in it. See the
full matrix in [Trust model](trust-model.md).

Every decision, allow or deny, is appended to `~/.praetorix/audit.log` before the hook returns.
