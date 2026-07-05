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
const MANIFEST_PATH = path.join(ROOT, 'reports', 'failed-tests.json');
const NPX_COMMAND = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function main(): void {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Failed test manifest not found at ${MANIFEST_PATH}. Run "npm run analyze:failures" first.`
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

  const result = spawnSync(NPX_COMMAND, ['playwright', 'test', ...manifest.playwrightArgs], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  process.exit(result.status ?? 1);
}

main();
