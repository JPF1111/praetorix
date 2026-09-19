# Ledger schema

`~/.praetorix/ledger.json` is a flat JSON object, keyed by invocation name. Each entry:

```json
{
  "key": "mcp-server-dev:build-mcp-app",
  "skillName": "build-mcp-app",
  "invocationName": "mcp-server-dev:build-mcp-app",
  "path": "/Users/you/.claude/plugins/cache/.../build-mcp-app",
  "hash": "43008b6d83c7e792b3ab...",
  "verdict": "APPROVE",
  "note": "reviewed with skill-inspector, no code-anchored findings",
  "approvedBy": "you",
  "recordedAt": "2026-09-19T01:28:22.276Z",
  "scannerVersion": "2.11.2",
  "scan": {
    "ran": true,
    "score": 12,
    "severity": "LOW",
    "recommendation": "SAFE",
    "analysisComplete": true
  }
}
```

| Field | Meaning |
|---|---|
| `key` / `invocationName` | The name the skill is invoked by — the ledger's lookup key. |
| `skillName` | The resolved directory's basename (informational only). |
| `path` | The resolved directory at the time of approval (informational — not what's checked on re-gate; the hash is). |
| `hash` | SHA-256 from `src/hash.js`. The gate compares this against a fresh hash of `path` at decision time. |
| `verdict` | `APPROVE`, `CAUTION`, or `REJECT`. Anything else is treated as unrecognized and denies. |
| `scan.analysisComplete` | SkillSpector's own `analysis_completeness.is_complete`. `false` means the scan hit a resource ceiling — treat a clean-looking `recommendation` with this set `false` skeptically. |

The file is written atomically (temp file + rename) and `chmod 600` on every write.
