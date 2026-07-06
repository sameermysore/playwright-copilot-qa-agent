import fs from 'node:fs';
import path from 'node:path';
import { AI_REPORTS_DIR_NAME } from './lib/ai-reports-session';

const ROOT = process.cwd();

const FILES = ['reports/playwright-report.json'];

const DIRS = [
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

function cleanAiReports(): void {
  const aiReportsDir = path.join(ROOT, AI_REPORTS_DIR_NAME);
  if (!fs.existsSync(aiReportsDir)) {
    return;
  }

  for (const entry of fs.readdirSync(aiReportsDir)) {
    if (entry === 'README.md') {
      continue;
    }

    const fullPath = path.join(aiReportsDir, entry);
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`Removed ${AI_REPORTS_DIR_NAME}/${entry}`);
  }
}

for (const file of FILES) {
  removeFile(file);
}

for (const dir of DIRS) {
  removeDir(dir);
}

cleanAiReports();

console.log('Reports cleared. Tests and page objects unchanged.');
