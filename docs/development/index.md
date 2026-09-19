# Development

See [`CONTRIBUTING.md`](https://github.com/JPF1111/praetorix/blob/main/CONTRIBUTING.md) in the
repository root for the full contribution process.

## Running the test suite

```bash
npm test
```

Runs `node --test` over everything in `test/` — no build step, no transpilation. 25 tests as of
0.1.0, covering every branch of the resolver, the full gate decision matrix, hash
stability/sensitivity (including symlink handling and cycle safety), and a check that the
hardcoded trust hash for the vendored `skill-inspector` skill still matches the file on disk.

## Validating the plugin manifest

```bash
claude plugin validate .
```

CI runs this on every push; running it locally before opening a PR catches manifest errors
faster.

## No runtime dependencies, by design

Everything in `src/` uses only Node.js built-ins (`fs`, `path`, `crypto`, `child_process`,
`os`). No `npm install` is required for the plugin to function once installed via Claude Code's
marketplace mechanism — keep it that way unless there's a strong reason not to.
