import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { requireSessionDir, SESSION_FILES } from './lib/ai-reports-session';
import { refreshSessionReports } from './lib/refresh-session-reports';

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
const PLAYWRIGHT_CLI = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');

function runPlaywright(args: string[]): number {
  if (fs.existsSync(PLAYWRIGHT_CLI)) {
    return spawnSync(process.execPath, [PLAYWRIGHT_CLI, 'test', ...args], {
      cwd: ROOT,
      stdio: 'inherit',
    }).status ?? 1;
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return spawnSync(npx, ['playwright', 'test', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  }).status ?? 1;
}

function main(): void {
  let manifestPath: string;
  try {
    manifestPath = path.join(requireSessionDir(ROOT), SESSION_FILES.failedTests);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message} Run playwright-rca first to create the session.`);
  }

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Failed test manifest not found at ${path.relative(ROOT, manifestPath)}. Run playwright-rca first.`
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as FailedTestsManifest;

  if (manifest.count === 0 || manifest.playwrightArgs.length === 0) {
    console.log('No failed tests to re-run.');
    process.exit(0);
  }

  console.log(`Re-running ${manifest.count} failed test(s)...`);
  manifest.failures.forEach((failure) => {
    console.log(`- ${failure.testFile} > ${failure.testTitle}`);
  });

  const testStatus = runPlaywright(manifest.playwrightArgs);

  console.log('');
  console.log('Refreshing failure report...');
  refreshSessionReports(ROOT, true);

  process.exit(testStatus);
}

main();
