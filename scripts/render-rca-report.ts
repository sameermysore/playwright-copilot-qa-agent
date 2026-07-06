import fs from 'node:fs';
import path from 'node:path';
import {
  relativeSessionPath,
  readSessionId,
  requireSessionDir,
  SESSION_FILES,
  sessionFilePath,
} from './lib/ai-reports-session';

interface DiagnosisFailure {
  testTitle: string;
  testFile: string;
  classification: string;
  confidence: string;
  summary: string;
  evidence: string[];
  owner: string;
  recommendedAction: string;
  actionTaken: string | null;
  validation: {
    ranAt: string;
    passed: boolean;
    remainingFailures: string[];
  } | null;
}

interface Diagnosis {
  generated: string;
  failures: DiagnosisFailure[];
}

interface FailedTestsManifest {
  generated: string;
  failures: Array<{
    testTitle: string;
    errorContext: string;
  }>;
}

const ROOT = process.cwd();
const TEMPLATE_PATH = path.join(ROOT, '.github', 'templates', 'rca-report.html');

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function suiteName(testFile: string): string {
  const base = path.basename(testFile, path.extname(testFile));
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function actionLabel(failure: DiagnosisFailure): string {
  if (failure.recommendedAction === 'inspect-source' && !failure.validation?.passed && !failure.actionTaken) {
    return 'Inspect source';
  }
  if (failure.validation?.passed) {
    return 'Fixed and validated';
  }
  if (failure.actionTaken) {
    return failure.actionTaken;
  }
  return failure.recommendedAction;
}

function readErrorFromContext(relativePath: string): string {
  if (!relativePath) {
    return 'Error context not available.';
  }

  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return 'Error context file not found.';
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const start = content.indexOf('# Error details');
  if (start === -1) {
    return 'Error details not found in error-context.md.';
  }

  const bodyStart = start + '# Error details'.length;
  const nextHeading = content.indexOf('\n# ', bodyStart);
  const section =
    nextHeading === -1 ? content.slice(bodyStart) : content.slice(bodyStart, nextHeading);
  const match = section.match(/```[^\n]*\n([\s\S]*?)```/);

  return match?.[1]?.trim() ?? 'Error details not available.';
}

function loadErrorByTitle(failedTestsPath: string): Map<string, string> {
  const errors = new Map<string, string>();

  if (!fs.existsSync(failedTestsPath)) {
    return errors;
  }

  const manifest = JSON.parse(fs.readFileSync(failedTestsPath, 'utf8')) as FailedTestsManifest;
  for (const failure of manifest.failures) {
    errors.set(failure.testTitle, readErrorFromContext(failure.errorContext));
  }

  return errors;
}

function buildSummary(failures: DiagnosisFailure[]): string {
  const passed = failures.filter((failure) => failure.validation?.passed).length;
  const inspect = failures.filter(
    (failure) => failure.recommendedAction === 'inspect-source' && !failure.validation?.passed
  ).length;
  const pending = failures.length - passed - inspect;

  const parts = [
    `${failures.length} failure(s) investigated.`,
    passed > 0 ? `${passed} passed on rerun.` : '',
    inspect > 0 ? `${inspect} need source inspection or approval.` : '',
    pending > 0 ? `${pending} still pending.` : '',
  ].filter(Boolean);

  return escapeHtml(parts.join(' '));
}

function buildOverallStatus(failures: DiagnosisFailure[]): string {
  const passed = failures.filter((failure) => failure.validation?.passed).length;
  const inspect = failures.filter(
    (failure) => failure.recommendedAction === 'inspect-source' && !failure.validation?.passed
  ).length;
  const open = failures.length - passed;

  if (open === 0) {
    return '<span class="status-pass">All resolved</span>';
  }
  if (passed > 0 && inspect > 0) {
    return `<span class="status-pass">${passed} passed</span> on rerun, <span class="status-warn">${inspect} need source fix</span>`;
  }
  if (inspect > 0) {
    return `<span class="status-warn">${inspect} need source fix</span>`;
  }
  return `<span class="status-fail">${open} open</span>`;
}

function buildValidation(failures: DiagnosisFailure[], reportGenerated: string): string {
  const validationTimes = failures
    .map((failure) => failure.validation?.ranAt)
    .filter((value): value is string => Boolean(value));

  const ranAt = validationTimes[0] ?? reportGenerated;
  const passed = failures.filter((failure) => failure.validation?.passed).length;
  const remaining = failures.flatMap((failure) => failure.validation?.remainingFailures ?? []);

  if (validationTimes.length === 0) {
    return 'Validation not run.';
  }

  const result =
    remaining.length === 0
      ? `${passed} passed, 0 failed.`
      : `${passed} passed, ${remaining.length} still failing.`;

  return `Ran <code>npm run test:failed</code> at <time datetime="${escapeHtml(ranAt)}">${escapeHtml(ranAt)}</time>. ${escapeHtml(result)}`;
}

function buildCaseBlock(failure: DiagnosisFailure, errorText: string): string {
  const evidenceHtml = failure.evidence
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  return `
    <section class="case">
      <div class="case-head">
        <h2>${escapeHtml(failure.testTitle)}</h2>
        <div class="case-meta">
          <code>${escapeHtml(failure.testFile)}</code>
          · ${escapeHtml(suiteName(failure.testFile))}
        </div>
      </div>
      <div class="facts">
        <div><label>Cause</label><span>${escapeHtml(failure.classification)}</span></div>
        <div><label>Confidence</label><span>${escapeHtml(failure.confidence)}</span></div>
        <div><label>Action</label><span>${escapeHtml(actionLabel(failure))}</span></div>
      </div>
      <div class="case-body">
        <div class="blurb">${escapeHtml(failure.summary)}</div>
        <div class="block">
          <h3>Evidence</h3>
          <ul>${evidenceHtml}</ul>
        </div>
        <div class="block">
          <h3>What we did</h3>
          <p>${escapeHtml(failure.actionTaken ?? failure.recommendedAction)}</p>
        </div>
        <details>
          <summary>Raw error</summary>
          <pre>${escapeHtml(errorText)}</pre>
        </details>
      </div>
    </section>`;
}

function main(): void {
  const diagnosisPath = sessionFilePath(SESSION_FILES.diagnosis, ROOT);
  if (!fs.existsSync(diagnosisPath)) {
    throw new Error(
      `Missing ${path.relative(ROOT, diagnosisPath)}. Run playwright-rca and playwright-fixer first.`
    );
  }

  const failedTestsPath = sessionFilePath(SESSION_FILES.failedTests, ROOT);
  const failureReportPath = sessionFilePath(SESSION_FILES.failureReport, ROOT);
  const outputPath = sessionFilePath(SESSION_FILES.rcaReport, ROOT);

  const diagnosis = JSON.parse(fs.readFileSync(diagnosisPath, 'utf8')) as Diagnosis;
  const failureReport = fs.existsSync(failureReportPath)
    ? fs.readFileSync(failureReportPath, 'utf8')
    : '';
  const reportGenerated =
    failureReport.match(/^Generated: (.+)$/m)?.[1]?.trim() ?? diagnosis.generated;
  const errorByTitle = loadErrorByTitle(failedTestsPath);

  const cases = diagnosis.failures
    .map((failure) => {
      const errorText =
        errorByTitle.get(failure.testTitle) ??
        (failure.validation?.passed ? 'Resolved on rerun.' : failure.summary);
      return buildCaseBlock(failure, errorText);
    })
    .join('\n');

  let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  html = html
    .replaceAll('{{GENERATED_ISO}}', escapeHtml(diagnosis.generated || reportGenerated))
    .replaceAll('{{FAILURE_COUNT}}', String(diagnosis.failures.length))
    .replaceAll('{{OVERALL_STATUS}}', buildOverallStatus(diagnosis.failures))
    .replaceAll('{{SUMMARY}}', buildSummary(diagnosis.failures))
    .replaceAll('{{CASES}}', cases)
    .replaceAll('{{VALIDATION}}', buildValidation(diagnosis.failures, reportGenerated));

  fs.writeFileSync(outputPath, html, 'utf8');

  const sessionId = readSessionId(ROOT) ?? path.basename(requireSessionDir(ROOT));
  const relativeOutput = relativeSessionPath(sessionId, SESSION_FILES.rcaReport);
  console.log(`Wrote ${relativeOutput} (${diagnosis.failures.length} case(s)).`);
}

main();
