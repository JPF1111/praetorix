#!/usr/bin/env node
// @ts-check
import { runCli } from '../src/cli.js';

runCli(process.argv.slice(2)).then(
  (code) => process.exit(code ?? 0),
  (err) => {
    process.stderr.write(`praetorix: unexpected error: ${err?.stack || err}\n`);
    process.exit(1);
  },
);
