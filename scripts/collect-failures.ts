import fs from 'node:fs';
import path from 'node:path';

interface FailedTest {
  testName: string;
  testTitle: string;
  testFile: string;
  error: string;
  stackTrace: string;
  screenshotPath: string;
  tracePath: string;
}

interface FailedTestsManifest {
  generated: string;
  count: number;
  failures: Array<{
    testName: string;
    testFile: string;
    testTitle: string;
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
  error?: { message?: string; stack?: string };
  attachments?: Array<{ name?: string; path?: string; contentType?: string }>;
}

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'reports', 'playwright-report.json');
const INVESTIGATION_DIR = path.join(ROOT, 'reports', 'investigation');
const FAILURE_REPORT_PATH = path.join(INVESTIGATION_DIR, 'failure-report.md');
const FAILED_TESTS_PATH = path.join(INVESTIGATION_DIR, 'failed-tests.json');

function readPlaywrightReport(): PlaywrightJsonReport {
  if (!fs.existsSync(REPORT_PATH)) {
    throw new Error(
      `Playwright JSON report not found at ${REPORT_PATH}. Run "npm test" first.`
    );
  }

  const raw = fs.readFileSync(REPORT_PATH, 'utf8').trim();
  if (!raw) {
    throw new Error('Playwright JSON report is empty. Run "npm test" first.');
  }

  return JSON.parse(raw) as PlaywrightJsonReport;
}

function extractTestTitle(fullTitle: string): string {
  const parts = fullTitle.split(' > ');
  return parts[parts.length - 1] ?? fullTitle;
}

function resolveTestFile(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/');
  const candidates = [
    path.join(ROOT, normalized),
    path.join(ROOT, 'tests', path.basename(normalized)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function toRelativeTestFile(filePath: string): string {
  const resolved = resolveTestFile(filePath);
  if (resolved) {
    return path.relative(ROOT, resolved).replace(/\\/g, '/');
  }

  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('tests/') ? normalized : `tests/${path.basename(normalized)}`;
}

function getFailureDetails(result: PlaywrightResult): Pick<
  FailedTest,
  'error' | 'stackTrace' | 'screenshotPath' | 'tracePath'
> {
  const attachments = result.attachments ?? [];
  const screenshotPath =
    attachments.find((a) => a.name === 'screenshot' || a.contentType?.includes('image'))?.path ??
    '';
  const tracePath =
    attachments.find((a) => a.name === 'trace' || a.path?.endsWith('.zip'))?.path ?? '';

  return {
    error: result.error?.message ?? 'No error message captured.',
    stackTrace: result.error?.stack ?? '',
    screenshotPath,
    tracePath,
  };
}

function findFailedTests(suite: PlaywrightSuite, parentTitles: string[] = []): FailedTest[] {
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

        const details = getFailureDetails(result);

        failures.push({
          testName: fullTitle,
          testTitle: extractTestTitle(fullTitle),
          testFile: suiteFile !== 'unknown' ? toRelativeTestFile(suiteFile) : 'unknown',
          ...details,
        });
      }
    }
  }

  for (const child of suite.suites ?? []) {
    failures.push(...findFailedTests(child, nextTitles));
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

function writeFailedTestsJson(failures: FailedTest[]): void {
  const manifest: FailedTestsManifest = {
    generated: new Date().toISOString(),
    count: failures.length,
    failures: failures.map((failure) => ({
      testName: failure.testName,
      testFile: failure.testFile,
      testTitle: failure.testTitle,
    })),
    validateCommand: failures.length > 0 ? 'npm run test:failed' : 'npm test',
    playwrightArgs: buildFailedTestCommand(failures),
  };

  fs.mkdirSync(path.dirname(FAILED_TESTS_PATH), { recursive: true });
  fs.writeFileSync(FAILED_TESTS_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function formatPath(filePath: string): string {
  return filePath ? `\`${filePath.replace(/\\/g, '/')}\`` : 'not available';
}

function writeFailureReport(failures: FailedTest[]): void {
  const lines: string[] = [
    '# Failure Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total failures: ${failures.length}`,
    '',
  ];

  if (failures.length === 0) {
    lines.push('No failed tests were found in the latest Playwright JSON report.');
    lines.push('');
    lines.push('Run `npm test` first.');
  } else {
    lines.push('Failure facts for the agent — see `.github/skills/failure-investigation/SKILL.md`.');
    lines.push('');

    failures.forEach((failure, index) => {
      const cleanError = stripAnsi(failure.error).trim();
      const cleanStack = stripAnsi(failure.stackTrace).trim();
      const errorSummary = cleanError.split('\n').find((line) => line.trim()) ?? cleanError;

      lines.push(`## ${index + 1}. ${failure.testTitle}`);
      lines.push('');
      lines.push(`- **File:** \`${failure.testFile}\``);
      lines.push(`- **Error:** ${errorSummary}`);
      lines.push('');
      lines.push('### Full error');
      lines.push('');
      lines.push('```');
      lines.push(cleanError);
      lines.push('```');
      lines.push('');

      if (cleanStack) {
        lines.push('### Stack trace');
        lines.push('');
        lines.push('```');
        lines.push(cleanStack);
        lines.push('```');
        lines.push('');
      }

      lines.push(`- **Screenshot:** ${formatPath(failure.screenshotPath)}`);
      lines.push(`- **Trace:** ${formatPath(failure.tracePath)}`);
      lines.push('');
    });
  }

  fs.mkdirSync(path.dirname(FAILURE_REPORT_PATH), { recursive: true });
  fs.writeFileSync(FAILURE_REPORT_PATH, lines.join('\n'), 'utf8');
}

function main(): void {
  const report = readPlaywrightReport();
  const failures: FailedTest[] = [];

  for (const suite of report.suites ?? []) {
    failures.push(...findFailedTests(suite));
  }

  writeFailureReport(failures);
  writeFailedTestsJson(failures);

  console.log(`Collected ${failures.length} failure(s).`);
  console.log(`Report: reports/investigation/failure-report.md`);

  if (failures.length === 0) {
    console.log('No failures to investigate.');
  }
}

main();
