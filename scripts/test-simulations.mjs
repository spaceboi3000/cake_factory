import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Use the repo's TypeScript compiler and Node's test runner: no new dependency.
const output = mkdtempSync(join(tmpdir(), 'cake-factory-tests-'));
try {
  const compile = spawnSync(process.execPath, [
    'node_modules/typescript/bin/tsc', 'tests/simulations.test.ts',
    '--outDir', output, '--module', 'commonjs', '--target', 'ES2020',
    '--esModuleInterop', '--strict', '--skipLibCheck',
  ], { stdio: 'inherit' });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    // Loading node:test runs and reports the suite without another worker/IPC
    // layer, which also works in restricted local development environments.
    const tests = spawnSync(process.execPath, [join(output, 'tests/simulations.test.js')], { stdio: 'inherit' });
    if (tests.error) throw tests.error;
    process.exitCode = tests.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
