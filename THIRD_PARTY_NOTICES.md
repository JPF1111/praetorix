# Third-party notices

This project's own code (everything except the file listed below) is licensed under
Apache-2.0 — see [`LICENSE`](LICENSE).

## `skills/skill-inspector/SKILL.md`

Copied **verbatim, byte-for-byte, unmodified** from
[NVIDIA/skillspector](https://github.com/NVIDIA/skillspector)'s
`skills/skill-inspector/SKILL.md`, pinned to commit
[`d162d9b3`](https://github.com/NVIDIA/skillspector/blob/d162d9b343e559be13df8ebba093df3bc9d58c90/skills/skill-inspector/SKILL.md).

- **License:** Apache-2.0 (same license as this repository; the upstream project ships no
  separate `NOTICE` file to propagate).
- **Copyright:** NVIDIA Corporation and SkillSpector contributors.
- **Integrity:** the exact content hash of this vendored file is hardcoded in `src/trusted.js`
  and checked against the file on disk by `test/trusted.test.js` on every test run and in CI.
  If the two ever disagree, tests fail — this is deliberate, not a bug: it means either the
  vendored file was edited (it shouldn't be — see below) or `src/trusted.js` is stale.
- **Why it's vendored rather than fetched at install time:** Claude Code plugins are
  self-contained bundles with no install-time script hook to pull external content, so a
  working copy has to ship in the plugin itself.
- **Updating it:** if you want the current upstream version, diff this file against the URL
  above and open a PR here — as a deliberate content change, with the hash in
  `src/trusted.js` recomputed and updated in the same commit
  (`node -e "import('./src/hash.js').then(({hashSkillDir}) => console.log(hashSkillDir('./skills/skill-inspector')))"`).
  Never edit the vendored file itself without recomputing that hash — a mismatch fails the
  gate's own bootstrap trust check, not just the test.

Everything else in this repository — `src/*.js`, `bin/praetorix.js`, the plugin/marketplace/hook
manifests, and this documentation — is original work, not derived from SkillSpector's source,
and is licensed under Apache-2.0 in its own right. Praetorix depends on the `skillspector` CLI
as an external runtime dependency (installed separately by the user, not vendored), also
Apache-2.0.
