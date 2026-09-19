# Security

See the canonical [`SECURITY.md`](https://github.com/JPF1111/praetorix/blob/main/SECURITY.md)
in the repository root for the full policy: how to report a vulnerability, official
distribution surfaces, scope, and operational disclosures.

The short version:

- **Report privately:** [GitHub private vulnerability reporting](https://github.com/JPF1111/praetorix/security/advisories/new) — never a public issue.
- **Official surfaces only:** `github.com/JPF1111/praetorix` and marketplace slug
  `praetorix@praetorix`. Nothing else is us.
- **What this defends against, and what it doesn't:** see
  [Trust model](../architecture/trust-model.md) for the full, honest breakdown.
- **A real disclosed side effect:** `skillspector scan` queries `api.osv.dev` for known
  vulnerable dependencies on every scan of a skill with a dependency manifest — even with
  `--no-llm`. Praetorix itself makes no network calls.
