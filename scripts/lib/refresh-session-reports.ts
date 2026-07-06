import fs from 'node:fs';
import path from 'node:path';
import {
  relativeSessionPath,
  resolveSessionDir,
  SESSION_FILES,
} from './ai-reports-session';

interface FailedTest {
  testName: string;
  testTitle: string;
  testFile: string;
  errorContextPath: string;
  screenshotPath: string;
  tracePath: string;
  videoPath: string;
}

interface FailedTestsManifest {
  generated: string;
  count: number;
  failures: Array<{
    testName: string;
    testFile: string;
    testTitle: string;
    errorContext: string;
    screenshot: string;
    trace: string;
    video: string;
  }>;
  validateCommand: string;
  playwrightArgs: string[];
}

interface PlaywrightJsonReport {
  suites?: PlaywrightSuite[];
}

interface PlaywrightSuite {
  title?: string;
  file?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightSpec {
  title?: string;
  tests?: PlaywrightTest[];
}

interface PlaywrightTest {
  results?: PlaywrightResult[];
}

interface PlaywrightResult {
  status?: string;
  attachments?: Array<{ name?: string; path?: string; contentType?: string }>;
}

function readPlaywrightReport(root: string): PlaywrightJsonReport {
  const reportPath = path.join(root, 'reports', 'playwright-report.json');

  if (!fs.existsSync(reportPath)) {
    throw new Error(
      `Playwright JSON report not found at ${reportPath}. Run "npm test" first.`
    );
  }

  const raw = fs.readFileSync(reportPath, 'utf8').trim();
  if (!raw) {
    throw new Error('Playwright JSON report is empty. Run "npm test" first.');
  }

  return JSON.parse(raw) as PlaywrightJsonReport;
}

function extractTestTitle(fullTitle: string): string {
  const parts = fullTitle.split(' > ');
  return parts[parts.length - 1] ?? fullTitle;
}

function resolveTestFile(root: string, relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/');
  const candidates = [
    path.join(root, normalized),
    path.join(root, 'tests', path.basename(normalized)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function toRelativeTestFile(root: string, filePath: string): string {
  const resolved = resolveTestFile(root, filePath);
  if (resolved) {
    return path.relative(root, resolved).replace(/\\/g, '/');
  }

  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('tests/') ? normalized : `tests/${path.basename(normalized)}`;
}

function toRelativePath(root: string, filePath: string): string {
  if (!filePath) {
    return '';
  }

  return path.relative(root, filePath).replace(/\\/g, '/');
}

function attachmentPath(
  root: string,
  attachments: PlaywrightResult['attachments'],
  name: string
): string {
  const match = attachments?.find((attachment) => attachment.name === name);
  return match?.path ? toRelativePath(root, match.path) : '';
}

function getArtifactPaths(
  root: string,
  result: PlaywrightResult
): Pick<FailedTest, 'errorContextPath' | 'screenshotPath' | 'tracePath' | 'videoPath'> {
  const attachments = result.attachments ?? [];

  return {
    errorContextPath: attachmentPath(root, attachments, 'error-context'),
    screenshotPath:
      attachmentPath(root, attachments, 'screenshot') ||
      toRelativePath(
        root,
        attachments.find((attachment) => attachment.contentType?.includes('image'))?.path ?? ''
      ),
    tracePath:
      attachmentPath(root, attachments, 'trace') ||
      toRelativePath(
        root,
        attachments.find((attachment) => attachment.path?.endsWith('.zip'))?.path ?? ''
      ),
    videoPath: attachmentPath(root, attachments, 'video'),
  };
}

function formatPath(filePath: string): string {
  return filePath ? `\`${filePath}\`` : 'not available';
}

function findFailedTests(
  root: string,
  suite: PlaywrightSuite,
  parentTitles: string[] = []
): FailedTest[] {
  const failures: FailedTest[] = [];
  const suiteTitle = suite.title ?? '';
  const nextTitles = suiteTitle ? [...parentTitles, suiteTitle] : parentTitles;
  const suiteFile = suite.file ?? 'unknown';

  for (const spec of suite.specs ?? []) {
    const specTitle = spec.title ?? 'unknown test';
    const fullTitle = [...nextTitles, specTitle].join(' > ');

    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) {
        if (result.status !== 'failed' && result.status !== 'timedOut') {
          continue;
        }

        failures.push({
          testName: fullTitle,
          testTitle: extractTestTitle(fullTitle),
          testFile: suiteFile !== 'unknown' ? toRelativeTestFile(root, suiteFile) : 'unknown',
          ...getArtifactPaths(root, result),
        });
      }
    }
  }

  for (const child of suite.suites ?? []) {
    failures.push(...findFailedTests(root, child, nextTitles));
  }

  return failures;
}

function buildFailedTestCommand(
  failures: Array<Pick<FailedTest, 'testFile' | 'testTitle'>>
): string[] {
  if (failures.length === 0) {
    return [];
  }

  if (failures.length === 1) {
    const failure = failures[0];
    return [failure.testFile, '-g', failure.testTitle];
  }

  const files = [...new Set(failures.map((failure) => failure.testFile))];
  const grepPattern = failures
    .map((failure) => failure.testTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  return [...files, '-g', grepPattern];
}

function writeFailedTestsJson(sessionDir: string, failures: FailedTest[], generated: string): void {
  const manifest: FailedTestsManifest = {
    generated,
    count: failures.length,
    failures: failures.map((failure) => ({
      testName: failure.testName,
      testFile: failure.testFile,
      testTitle: failure.testTitle,
      errorContext: failure.errorContextPath,
      screenshot: failure.screenshotPath,
      trace: failure.tracePath,
      video: failure.videoPath,
    })),
    validateCommand: failures.length > 0 ? 'npm run test:failed' : 'npm test',
    playwrightArgs: buildFailedTestCommand(failures),
  };

  const outputPath = path.join(sessionDir, SESSION_FILES.failedTests);
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function writeFailureReport(sessionDir: string, failures: FailedTest[], generated: string): void {
  const lines: string[] = [
    '# Failure Report',
    '',
    `Generated: ${generated}`,
    `Total failures: ${failures.length}`,
    '',
    'Index of failed tests. Read each Playwright `error-context.md` for evidence.',
    `Screenshot, trace, video paths and rerun args: \`${SESSION_FILES.failedTests}\`.`,
    '',
  ];

  if (failures.length === 0) {
    lines.push('No failed tests were found in the latest Playwright JSON report.');
    lines.push('');
    lines.push('Run `npm test` first.');
  } else {
    failures.forEach((failure, index) => {
      lines.push(`## ${index + 1}. ${failure.testTitle}`);
      lines.push('');
      lines.push(`- **File:** \`${failure.testFile}\``);
      lines.push(`- **Error context:** ${formatPath(failure.errorContextPath)}`);
      lines.push('');
    });
  }

  const outputPath = path.join(sessionDir, SESSION_FILES.failureReport);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}

/** Refresh failure-report.md and failed-tests.json in the active session from Playwright JSON. */
export function refreshSessionReports(root = process.cwd(), refresh = false): {
  sessionDir: string;
  sessionId: string;
  failureCount: number;
} {
  const report = readPlaywrightReport(root);
  const failures: FailedTest[] = [];
  const generated = new Date().toISOString();

  for (const suite of report.suites ?? []) {
    failures.push(...findFailedTests(root, suite));
  }

  const sessionDir = resolveSessionDir(root, refresh);
  const sessionId = path.basename(sessionDir);

  writeFailureReport(sessionDir, failures, generated);
  writeFailedTestsJson(sessionDir, failures, generated);

  console.log(`Refreshed ${failures.length} failure(s) in session.`);
  console.log(`Session: ${relativeSessionPath(sessionId)}`);
  console.log(`Index: ${relativeSessionPath(sessionId, SESSION_FILES.failureReport)}`);

  return { sessionDir, sessionId, failureCount: failures.length };
}
