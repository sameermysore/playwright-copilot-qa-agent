import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const FILES = ['reports/playwright-report.json'];

const DIRS = [
  'reports/investigation',
  'reports/html',
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

// Restore empty investigation folder with manual-review template
const investigationDir = path.join(ROOT, 'reports', 'investigation');
fs.mkdirSync(investigationDir, { recursive: true });
fs.writeFileSync(
  path.join(investigationDir, 'manual-review.md'),
  '# Manual Review\n\nThe agent appends entries here when a failure root cause is unclear.\n',
  'utf8'
);

console.log('Reports cleared. Tests and page objects unchanged.');
