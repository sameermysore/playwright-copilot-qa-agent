import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const PLAYWRIGHT_CLI = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
const TSX_CLI = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const COLLECT_SCRIPT = path.join(ROOT, 'scripts', 'collect-failures.ts');

function runPlaywrightTests(): number {
  if (fs.existsSync(PLAYWRIGHT_CLI)) {
    const result = spawnSync(process.execPath, [PLAYWRIGHT_CLI, 'test'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    return result.status ?? 1;
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npx, ['playwright', 'test'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  return result.status ?? 1;
}

function runCollectFailures(): number {
  if (fs.existsSync(TSX_CLI)) {
    const result = spawnSync(process.execPath, [TSX_CLI, COLLECT_SCRIPT], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    return result.status ?? 1;
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npx, ['tsx', COLLECT_SCRIPT], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  return result.status ?? 1;
}

const testStatus = runPlaywrightTests();
const collectStatus = runCollectFailures();

if (collectStatus !== 0) {
  process.exit(collectStatus);
}

process.exit(testStatus);
