// @ts-check

// Closes the bootstrap paradox: without this, the gate would block the
// very review skill (`skill-inspector`) that its own deny messages tell
// you to use to review and approve *other* skills, on a machine where
// nothing has been approved yet.
//
// This is deliberately narrow and explicit, not a general escape hatch:
// exactly one entry, for the exact vendored file this repository ships
// (see THIRD_PARTY_NOTICES.md), matched by BOTH invocation name and
// content hash. If the vendored SKILL.md is ever edited, this hash goes
// stale and the entry stops matching — re-vendor and recompute it
// deliberately (`node -e "import('./src/hash.js').then(({hashSkillDir})
// => console.log(hashSkillDir('./skills/skill-inspector')))"`), never
// widen this list to cover anything else.
export const TRUSTED_ENTRIES = [
  {
    invocationName: 'praetorix:skill-inspector',
    hash: '43008b6d83c7e792b3ab67505f2ec88cf0a9a6bbb6a1202dbed730f2d0a40c3f',
    reason: 'pre-approved: the vendored NVIDIA skill-inspector review skill this plugin ships (see THIRD_PARTY_NOTICES.md)',
  },
];

/**
 * @param {string} invocationName
 * @param {string} currentHash
 * @returns {string | null} the trust reason if matched, else null
 */
export function checkTrusted(invocationName, currentHash) {
  const entry = TRUSTED_ENTRIES.find(
    (e) => e.invocationName === invocationName && e.hash === currentHash,
  );
  return entry ? entry.reason : null;
}
