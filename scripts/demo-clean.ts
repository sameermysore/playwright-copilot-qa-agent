import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const FILES = [
  'reports/playwright-report.json',
  'reports/failed-tests.json',
  'reports/failure-context.md',
  'reports/manual-review-required.md',
  'reports/test-review-report.md',
  'reports/test-case-context.md',
  'reports/manual-test-cases.md',
];

const DIRS = [
  'reports/html',
  'reports/fix-reports',
  'test-results',
  'playwright-report',
  'blob-report',
];

function removeFile(relativePath: string): void {
  const fullPath = path.join(ROOT, relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`Removed ${relativePath}`);
  }
}

function removeDir(relativePath: string): void {
  const fullPath = path.join(ROOT, relativePath);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`Removed ${relativePath}/`);
  }
}

for (const file of FILES) {
  removeFile(file);
}

for (const dir of DIRS) {
  removeDir(dir);
}

console.log('Demo artifacts cleared. Source tests and requirements are unchanged.');
