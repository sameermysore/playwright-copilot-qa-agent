import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

interface FailedTestsManifest {
  generated: string;
  count: number;
  validateCommand: string;
  playwrightArgs: string[];
  failures: Array<{
    testName: string;
    testFile: string;
    testTitle: string;
  }>;
}

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'reports', 'investigation', 'failed-tests.json');
const PLAYWRIGHT_CLI = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
const TSX_CLI = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const COLLECT_SCRIPT = path.join(ROOT, 'scripts', 'collect-failures.ts');

function runCollectFailures(): number {
  if (fs.existsSync(TSX_CLI)) {
    return spawnSync(process.execPath, [TSX_CLI, COLLECT_SCRIPT], {
      cwd: ROOT,
      stdio: 'inherit',
    }).status ?? 1;
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return spawnSync(npx, ['tsx', COLLECT_SCRIPT], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  }).status ?? 1;
}

function main(): void {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Failed test manifest not found at ${MANIFEST_PATH}. Run "npm test" first, then ask the agent to investigate.`
    );
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as FailedTestsManifest;

  if (manifest.count === 0 || manifest.playwrightArgs.length === 0) {
    console.log('No failed tests to re-run.');
    process.exit(0);
  }

  console.log(`Re-running ${manifest.count} failed test(s)...`);
  manifest.failures.forEach((failure) => {
    console.log(`- ${failure.testFile} > ${failure.testTitle}`);
  });

  const testResult = fs.existsSync(PLAYWRIGHT_CLI)
    ? spawnSync(process.execPath, [PLAYWRIGHT_CLI, 'test', ...manifest.playwrightArgs], {
        cwd: ROOT,
        stdio: 'inherit',
      })
    : spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['playwright', 'test', ...manifest.playwrightArgs], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: true,
      });

  const testStatus = testResult.status ?? 1;

  console.log('');
  console.log('Refreshing failure report...');
  const collectStatus = runCollectFailures();

  if (collectStatus !== 0) {
    process.exit(collectStatus);
  }

  process.exit(testStatus);
}

main();
