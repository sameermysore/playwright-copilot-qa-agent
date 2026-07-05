import fs from 'node:fs';
import path from 'node:path';

type FailureCategory =
  | 'locator issue'
  | 'assertion issue'
  | 'test code issue'
  | 'test data issue'
  | 'timing issue'
  | 'possible application bug'
  | 'unknown/manual review';

type FixDecision = 'AUTO_FIX_CANDIDATE' | 'MANUAL_REVIEW_REQUIRED';

interface ParsedFailure {
  testName: string;
  testTitle: string;
  testFile: string;
  filePath: string;
  error: string;
  stackTrace: string;
  screenshotPath: string;
  tracePath: string;
  category: FailureCategory;
  decision: FixDecision;
  rationale: string;
  suggestedAction: string;
}

interface FailedTestsManifest {
  generated: string;
  count: number;
  failures: Array<{
    testName: string;
    testFile: string;
    testTitle: string;
    decision: FixDecision;
  }>;
  validateCommand: string;
  playwrightArgs: string[];
}

interface PlaywrightJsonReport {
  suites?: PlaywrightSuite[];
  errors?: Array<{ message?: string }>;
}

interface PlaywrightSuite {
  title?: string;
  file?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightSpec {
  title?: string;
  ok?: boolean;
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

interface ClassificationInput {
  testName: string;
  filePath: string;
  error: string;
  stackTrace: string;
  testSource: string | null;
}

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'reports', 'playwright-report.json');
const FAILURE_CONTEXT_PATH = path.join(ROOT, 'reports', 'failure-context.md');
const MANUAL_REVIEW_PATH = path.join(ROOT, 'reports', 'manual-review-required.md');
const FAILED_TESTS_PATH = path.join(ROOT, 'reports', 'failed-tests.json');

const NEGATIVE_TEST_TITLE =
  /\b(invalid|wrong|failed|failure|incorrect|reject|denied|locked|empty|missing|unauthorized|negative|bad credentials)\b/i;
const POSITIVE_TEST_TITLE =
  /\b(successful|valid|success|happy path|complete|should work|redirects to|loads|displays)\b/i;

function readJsonReport(): PlaywrightJsonReport {
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

function toRelativeTestFile(filePath: string): string {
  const resolved = resolveTestFile(filePath);
  if (resolved) {
    return path.relative(ROOT, resolved).replace(/\\/g, '/');
  }

  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('tests/') ? normalized : `tests/${path.basename(normalized)}`;
}

function buildFailedTestRunArgs(
  failures: Array<Pick<ParsedFailure, 'testFile' | 'testTitle'>>
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

function buildFailedTestsManifest(failures: ParsedFailure[]): FailedTestsManifest {
  const playwrightArgs = buildFailedTestRunArgs(failures);

  return {
    generated: new Date().toISOString(),
    count: failures.length,
    failures: failures.map((failure) => ({
      testName: failure.testName,
      testFile: failure.testFile,
      testTitle: failure.testTitle,
      decision: failure.decision,
    })),
    validateCommand: failures.length > 0 ? 'npm run test:failed' : 'npm test',
    playwrightArgs,
  };
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

function readTestSource(relativePath: string): string | null {
  const resolved = resolveTestFile(relativePath);
  if (!resolved) {
    return null;
  }

  return fs.readFileSync(resolved, 'utf8');
}

function extractTestBlock(source: string, testTitle: string): string | null {
  const escapedTitle = testTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockPattern = new RegExp(
    `test\\(\\s*['"\`]${escapedTitle}['"\`][\\s\\S]*?\\n\\s*\\}\\);`,
    'm'
  );
  const match = source.match(blockPattern);
  return match?.[0] ?? null;
}

function usesValidCredentials(testBlock: string | null, fullSource: string | null): boolean {
  const source = testBlock ?? fullSource ?? '';
  return (
    /VALID_USERNAME|VALID_PASSWORD/.test(source) ||
    /login\s*\(\s*['"`]standard_user['"`]/.test(source) ||
    /login\s*\(\s*VALID_USERNAME/.test(source)
  );
}

function usesInvalidCredentials(testBlock: string | null, fullSource: string | null): boolean {
  const block = testBlock ?? '';
  const source = testBlock ?? fullSource ?? '';
  return (
    /login\s*\(\s*INVALID_USERNAME/.test(block) ||
    /invalid_user|wrong_password|locked_out_user/.test(source) ||
    /login\s*\(\s*['"`][^'"`]*invalid/.test(source)
  );
}

function hasCredentialMismatch(testBlock: string | null): boolean {
  if (!testBlock) {
    return false;
  }

  if (/login\s*\(\s*VALID_USERNAME\s*,\s*VALID_PASSWORD\s*\)/.test(testBlock)) {
    return false;
  }

  if (/login\s*\(\s*VALID_USERNAME\s*,/.test(testBlock)) {
    return true;
  }

  if (/login\s*\(\s*['"`]standard_user['"`]\s*,\s*['"`]secret_sauce['"`]/.test(testBlock)) {
    return false;
  }

  if (/login\s*\(\s*['"`]standard_user['"`]/.test(testBlock)) {
    return true;
  }

  if (/login\s*\(\s*INVALID_USERNAME\s*,\s*INVALID_PASSWORD\s*\)/.test(testBlock)) {
    return true;
  }

  if (
    /login\s*\(\s*['"`](invalid_user|wrong_password|locked_out_user)['"`]/.test(testBlock)
  ) {
    return true;
  }

  return false;
}

function expectsErrorAssertion(testBlock: string | null, error: string): boolean {
  const source = testBlock ?? '';
  const combined = `${source}\n${error}`.toLowerCase();

  return (
    /errormessage|data-test="error"|epic sadface/.test(combined) ||
    /tohavetext|tocontaintext/.test(combined) && /error|sadface|do not match/.test(combined)
  );
}

function expectsSuccessOutcome(testBlock: string | null): boolean {
  const source = testBlock ?? '';
  return (
    /expectloaded|products|inventory|thank you for your order|complete-header|your cart/i.test(
      source
    ) && !expectsErrorAssertion(source, '')
  );
}

function isElementNotFound(error: string): boolean {
  const lower = error.toLowerCase();
  return lower.includes('element(s) not found') || lower.includes('waiting for locator');
}

function isStrictLocatorFailure(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes('strict mode violation') ||
    lower.includes('resolved to') ||
    (lower.includes('locator') && lower.includes('selector'))
  );
}

function isTextAssertionMismatch(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    (lower.includes('expected') && lower.includes('received')) ||
    (lower.includes('tohavetext') && !isElementNotFound(error)) ||
    (lower.includes('tocontaintext') && lower.includes('expected substring') && !isElementNotFound(error))
  );
}

function elementWasFound(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes('locator resolved') ||
    lower.includes('received string:') ||
    (isTextAssertionMismatch(error) && !isElementNotFound(error))
  );
}

function hasMismatchedCartItem(testBlock: string | null): boolean {
  if (!testBlock) {
    return false;
  }

  const itemMatch = testBlock.match(/(?:const|let)\s+itemName\s*=\s*['"`]([^'"`]+)['"`]/);
  const expectMatch = testBlock.match(/expectItemVisible\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);

  if (itemMatch && expectMatch) {
    return itemMatch[1] !== expectMatch[1];
  }

  return false;
}

function isCoreJourneyTest(testTitle: string, testBlock: string | null): boolean {
  const combined = `${testTitle}\n${testBlock ?? ''}`.toLowerCase();
  return (
    combined.includes('login') ||
    combined.includes('checkout') ||
    combined.includes('complete checkout') ||
    combined.includes('thank you for your order')
  );
}

function result(
  category: FailureCategory,
  decision: FixDecision,
  rationale: string,
  suggestedAction: string
): Pick<ParsedFailure, 'category' | 'decision' | 'rationale' | 'suggestedAction'> {
  return { category, decision, rationale, suggestedAction };
}

function classifyFailure(input: ClassificationInput): Pick<
  ParsedFailure,
  'category' | 'decision' | 'rationale' | 'suggestedAction'
> {
  const { testName, filePath, error, stackTrace, testSource } = input;
  const testTitle = extractTestTitle(testName);
  const testBlock = testSource ? extractTestBlock(testSource, testTitle) : null;
  const negativeTest = NEGATIVE_TEST_TITLE.test(testTitle);
  const positiveTest = POSITIVE_TEST_TITLE.test(testTitle);
  const validCreds = usesValidCredentials(testBlock, testSource);
  const invalidCreds = usesInvalidCredentials(testBlock, testSource);
  const expectsError = expectsErrorAssertion(testBlock, error);
  const expectsSuccess = expectsSuccessOutcome(testBlock);
  const elementMissing = isElementNotFound(error);

  // 1. Test data mismatch: negative test + expects error + uses valid credentials
  if (negativeTest && expectsError && elementMissing && validCreds && !invalidCreds) {
    return result(
      'test data issue',
      'AUTO_FIX_CANDIDATE',
      `The test "${testTitle}" is written as a negative scenario, but the test code uses valid credentials (for example VALID_USERNAME / VALID_PASSWORD). Login likely succeeded, so the error message element never appeared.`,
      'Replace valid credentials with invalid test data that matches the test title, then re-run npm run test:failed.'
    );
  }

  // 2. Test data mismatch: positive test + wrong login credentials in test code
  if (positiveTest && hasCredentialMismatch(testBlock) && elementMissing) {
    return result(
      'test data issue',
      'AUTO_FIX_CANDIDATE',
      `The test "${testTitle}" expects a successful login, but the test uses incorrect credentials in the login call (for example VALID_USERNAME with the wrong password).`,
      'Fix the login credentials in the test (for example use VALID_PASSWORD), then re-run npm run test:failed.'
    );
  }

  // 3. To be manually reviewed: negative test + invalid creds + error element never appears
  if (negativeTest && expectsError && elementMissing && invalidCreds) {
    return result(
      'possible application bug',
      'MANUAL_REVIEW_REQUIRED',
      `To be manually reviewed: the test "${testTitle}" uses invalid credentials and expects an error message, but no error element appeared. Confirm in the browser whether the app or the locator is wrong before changing the test.`,
      'Reproduce invalid login manually. If the app shows an error, inspect LoginPage locators. If the app is broken, log a defect. If the test setup is wrong, fix the test.'
    );
  }

  // 4. Test code: cart item added does not match item asserted in cart
  if (hasMismatchedCartItem(testBlock)) {
    return result(
      'test code issue',
      'AUTO_FIX_CANDIDATE',
      `The test adds one item to the cart but asserts a different item is visible. This is a mistake in the test code, not an application bug.`,
      'Use the same item name in addItemToCart() and expectItemVisible(), then re-run npm run test:failed.'
    );
  }

  // 5. Test code: assertion expected one value but the app showed another (element was found)
  if (isTextAssertionMismatch(error) && elementWasFound(error)) {
    return result(
      'test code issue',
      'AUTO_FIX_CANDIDATE',
      `The test assertion does not match what the application shows. The element was found, so this is likely a mistake in the test code (wrong expected value), not an application bug.`,
      'Update the expected value in the test to match correct application behavior, then re-run npm run test:failed.'
    );
  }

  // 6. To be manually reviewed: positive journey test cannot reach expected state (element never appeared)
  if (
    positiveTest &&
    expectsSuccess &&
    isCoreJourneyTest(testTitle, testBlock) &&
    elementMissing &&
    !hasCredentialMismatch(testBlock)
  ) {
    return result(
      'unknown/manual review',
      'MANUAL_REVIEW_REQUIRED',
      `To be manually reviewed: the test "${testTitle}" never reached an expected page element. Login or navigation may have failed, or the locator may be outdated. Review before changing code.`,
      'Check the screenshot/trace and reproduce manually. Fix the test only if the test code or locator is wrong; escalate if the application is broken.'
    );
  }
  // 7. Locator issues
  if (isStrictLocatorFailure(error)) {
    return result(
      'locator issue',
      'AUTO_FIX_CANDIDATE',
      'Playwright could not reliably target the intended element. This usually means the locator is ambiguous, outdated, or too brittle.',
      'Update the locator in the relevant page object to a stable strategy such as getByRole, getByLabel, or getByTestId, then re-run npm run test:failed.'
    );
  }

  // 8. Missing element on non-core or generic tests
  if (elementMissing) {
    if (negativeTest && expectsError) {
      return result(
        'test data issue',
        'AUTO_FIX_CANDIDATE',
        `The test "${testTitle}" expects an error state, but the expected error UI was not found. Review whether the test setup matches the intended negative scenario.`,
        'Check the credentials, input values, and preconditions in the test block. Align test data with the scenario described by the test title.'
      );
    }

    return result(
      'locator issue',
      'AUTO_FIX_CANDIDATE',
      'An expected element was not found within the timeout. This is often a locator or synchronization issue rather than a product defect.',
      'Inspect the page object locator and the screenshot/trace. Prefer Playwright auto-waiting and stable locators instead of hard waits.'
    );
  }

  // 9. Timing / wait issues
  const combined = `${error}\n${stackTrace}`.toLowerCase();
  if (
    combined.includes('timeout') ||
    combined.includes('not visible') ||
    combined.includes('not enabled')
  ) {
    if (positiveTest && isCoreJourneyTest(testTitle, testBlock)) {
      return result(
        'unknown/manual review',
        'MANUAL_REVIEW_REQUIRED',
        `To be manually reviewed: the test "${testTitle}" timed out before reaching the expected state. Review the trace to see if the test or the application is at fault.`,
        'Review the screenshot and trace first. Fix the test if the locator or flow is wrong; escalate only if the application is broken.'
      );
    }

    return result(
      'timing issue',
      'AUTO_FIX_CANDIDATE',
      'The test timed out waiting for an element or state. This often indicates a flaky wait strategy or a locator that does not match the current UI.',
      'Use Playwright auto-waiting and explicit expect assertions. Avoid waitForTimeout unless there is no better alternative.'
    );
  }

  // 8. Keyword fallback for test data hints in error text
  if (
    combined.includes('wrong password') ||
    combined.includes('invalid credentials') ||
    combined.includes('test data')
  ) {
    return result(
      'test data issue',
      'AUTO_FIX_CANDIDATE',
      'The failure message suggests incorrect or outdated test data.',
      'Correct the test input values or fixtures, then re-run npm run test:failed.'
    );
  }

  return result(
    'unknown/manual review',
    'MANUAL_REVIEW_REQUIRED',
    'To be manually reviewed: the analyzer could not confidently classify this failure. Review the test code and the application before changing anything.',
    'Review the screenshot, trace, and test source manually. Fix the test if the mistake is in test code; escalate if the application is broken.'
  );
}

function collectFailures(
  suite: PlaywrightSuite,
  parentTitles: string[] = []
): ParsedFailure[] {
  const failures: ParsedFailure[] = [];
  const suiteTitle = suite.title ?? '';
  const nextTitles = suiteTitle ? [...parentTitles, suiteTitle] : parentTitles;
  const suiteFile = suite.file ?? 'unknown';
  const testSource = suiteFile !== 'unknown' ? readTestSource(suiteFile) : null;

  for (const spec of suite.specs ?? []) {
    const specTitle = spec.title ?? 'unknown test';
    const fullTitle = [...nextTitles, specTitle].join(' > ');

    for (const test of spec.tests ?? []) {
      for (const resultItem of test.results ?? []) {
        if (resultItem.status !== 'failed' && resultItem.status !== 'timedOut') {
          continue;
        }

        const errorMessage = resultItem.error?.message ?? 'No error message captured.';
        const stackTrace = resultItem.error?.stack ?? '';
        const attachments = resultItem.attachments ?? [];
        const screenshotPath =
          attachments.find((a) => a.name === 'screenshot' || a.contentType?.includes('image'))
            ?.path ?? '';
        const tracePath =
          attachments.find((a) => a.name === 'trace' || a.path?.endsWith('.zip'))?.path ?? '';

        const classified = classifyFailure({
          testName: fullTitle,
          filePath: suiteFile,
          error: errorMessage,
          stackTrace,
          testSource,
        });

        const testTitle = extractTestTitle(fullTitle);

        failures.push({
          testName: fullTitle,
          testTitle,
          testFile: toRelativeTestFile(suiteFile),
          filePath: suiteFile,
          error: errorMessage,
          stackTrace,
          screenshotPath,
          tracePath,
          ...classified,
        });
      }
    }
  }

  for (const child of suite.suites ?? []) {
    failures.push(...collectFailures(child, nextTitles));
  }

  return failures;
}

function buildManualReviewReport(failures: ParsedFailure[]): string {
  const manual = failures.filter((f) => f.decision === 'MANUAL_REVIEW_REQUIRED');

  if (manual.length === 0) {
    return [
      '# Manual Review Required',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      'No tests require manual review.',
      '',
      'All failures in the latest run are safe for Copilot to fix automatically.',
      'See `reports/failure-context.md` for details.',
    ].join('\n');
  }

  const lines: string[] = [
    '# Manual Review Required',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total: ${manual.length} test(s)`,
    '',
    'These tests need a person to review before changing code.',
    '**This does not automatically mean an application bug** — the mistake may be in the test code.',
    '',
    'Copilot will ask before fixing these. Auto-fix the rest from `reports/failure-context.md`.',
    '',
    'Copilot should add `// to be manually reviewed` inside each manual-review test block (do not change test logic until approved).',
    '',
    '## Tests to manually review',
    '',
  ];

  manual.forEach((failure, index) => {
    lines.push(`### ${index + 1}. ${failure.testTitle}`);
    lines.push('');
    lines.push(`- **Status:** TO BE MANUALLY REVIEWED — do not auto-fix`);
    lines.push(`- **File:** \`${failure.testFile}\``);
    lines.push(`- **Copilot action:** add \`// to be manually reviewed\` in the test block; explain and wait for approval`);
    lines.push(`- **Category:** ${failure.category}`);
    lines.push(`- **Why manual review:** ${failure.rationale}`);
    lines.push(`- **Suggested action:** ${failure.suggestedAction}`);
    lines.push('');
    lines.push('**Error:**');
    lines.push('');
    lines.push('```');
    lines.push(failure.error.trim());
    lines.push('```');
    lines.push('');
  });

  return lines.join('\n');
}

function buildFailureContext(failures: ParsedFailure[]): string {
  if (failures.length === 0) {
    return [
      '# Failure Context',
      '',
      'No failed tests were found in the latest Playwright JSON report.',
      '',
      'Run `npm test` first, then `npm run prepare:failures` to populate this report.',
    ].join('\n');
  }

  const lines: string[] = [
    '# Failure Context',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total failures: ${failures.length}`,
    '',
    '## Validation',
    '',
    failures.length > 0
      ? 'After fixing, **Copilot** runs in the terminal:'
      : 'No targeted re-run needed.',
    '',
    '```bash',
    failures.length > 0 ? 'npm run test:failed' : 'npm test',
    '```',
    '',
    'Do **not** run `npm test` or `npm run prepare:failures` — the user already ran those.',
    '',
  ];

  failures.forEach((failure, index) => {
    lines.push(`## Failure ${index + 1}: ${failure.testName}`);
    lines.push('');
    lines.push(`- **File:** \`${failure.testFile}\``);
    lines.push(`- **Test:** \`${failure.testTitle}\``);
    lines.push(`- **Category:** ${failure.category}`);
    lines.push(`- **Decision:** ${failure.decision}`);
    if (failure.decision === 'MANUAL_REVIEW_REQUIRED') {
      lines.push(`- **Status:** TO BE MANUALLY REVIEWED — do not auto-fix without approval`);
      lines.push(`- **Copilot action:** add \`// to be manually reviewed\` in \`${failure.testFile}\``);
    }
    lines.push(`- **Rationale:** ${failure.rationale}`);
    lines.push(`- **Suggested action:** ${failure.suggestedAction}`);
    lines.push('');
    lines.push('### Error');
    lines.push('');
    lines.push('```');
    lines.push(failure.error.trim());
    lines.push('```');
    lines.push('');
  });

  const autoFix = failures.filter((f) => f.decision === 'AUTO_FIX_CANDIDATE');
  const manual = failures.filter((f) => f.decision === 'MANUAL_REVIEW_REQUIRED');

  if (manual.length > 0) {
    lines.push('## Manual review');
    lines.push('');
    lines.push(
      `${manual.length} test(s) require manual review. See **reports/manual-review-required.md** for the full list.`
    );
    lines.push('');
    lines.push('Copilot should add `// to be manually reviewed` in those spec files.');
    lines.push('');
    manual.forEach((failure) => {
      lines.push(`- \`${failure.testFile}\` → **${failure.testTitle}**`);
    });
    lines.push('');
  }

  lines.push('## Copilot next step');
  lines.push('');
  lines.push('In VS Code Copilot Chat (Agent mode), type: `/fix-playwright-failures`');
  lines.push('');
  lines.push('Read **only** this file: `reports/failure-context.md`');
  if (manual.length > 0) {
    lines.push('Also read: `reports/manual-review-required.md` for tests that need human review.');
  }
  lines.push('Do **not** look for `copilot-action-prompt.md` (removed in this POC).');
  lines.push('Do **not** create memory files or extra notes files.');
  lines.push('');
  lines.push('- Fix `AUTO_FIX_CANDIDATE` directly in test/page code');
  lines.push('- For `MANUAL_REVIEW_REQUIRED`: add `// to be manually reviewed` in the test, explain, and wait for approval');
  lines.push('- After fixing, Copilot runs `npm run test:failed` in the terminal');
  lines.push('- Do **not** run `npm test` or `npm run prepare:failures`');
  lines.push('- Write a readable fix report in `reports/fix-reports/` (test name, file, why it failed, what changed)');
  lines.push('');
  lines.push(`- AUTO_FIX_CANDIDATE: ${autoFix.length}`);
  lines.push(`- MANUAL_REVIEW_REQUIRED: ${manual.length}`);

  return lines.join('\n');
}

function main(): void {
  const report = readJsonReport();
  const failures: ParsedFailure[] = [];

  for (const suite of report.suites ?? []) {
    failures.push(...collectFailures(suite));
  }

  fs.mkdirSync(path.dirname(FAILURE_CONTEXT_PATH), { recursive: true });
  fs.writeFileSync(FAILURE_CONTEXT_PATH, buildFailureContext(failures), 'utf8');
  fs.writeFileSync(MANUAL_REVIEW_PATH, buildManualReviewReport(failures), 'utf8');
  fs.writeFileSync(
    FAILED_TESTS_PATH,
    `${JSON.stringify(buildFailedTestsManifest(failures), null, 2)}\n`,
    'utf8'
  );

  console.log(`Analyzed ${failures.length} failure(s).`);
  console.log(`Report: reports/failure-context.md`);
  console.log(`Manual review: reports/manual-review-required.md`);
  const manualCount = failures.filter((f) => f.decision === 'MANUAL_REVIEW_REQUIRED').length;
  if (manualCount > 0) {
    console.log(`${manualCount} test(s) require manual review — see reports/manual-review-required.md`);
  }
  if (failures.length === 0) {
    console.log('No failures to fix. Run npm test after a failing run, then re-run prepare:failures.');
  } else {
    console.log('Next: open VS Code and type /fix-playwright-failures');
    console.log('Then validate with: npm run test:failed');
  }
}

main();
