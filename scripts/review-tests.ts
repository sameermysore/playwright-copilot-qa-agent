import fs from 'node:fs';
import path from 'node:path';

interface ReviewFinding {
  severity: 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line?: number;
  message: string;
  suggestion: string;
}

const ROOT = process.cwd();
const TARGET_DIRS = ['tests', 'pages'];
const OUTPUT_PATH = path.join(ROOT, 'reports', 'test-review-report.md');

const BRITTLE_LOCATOR_PATTERNS = [
  { pattern: /\.locator\(\s*['"`]\./, label: 'CSS class locator' },
  { pattern: /xpath\s*=/i, label: 'XPath locator' },
  { pattern: /page\.locator\(\s*['"`]#[^'"`]+['"`]/, label: 'ID CSS locator in test/page code' },
];

function listTypeScriptFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join(entry.path ?? dir, entry.name));
}

function readLines(filePath: string): string[] {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
}

function relative(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function scanFile(filePath: string): ReviewFinding[] {
  const lines = readLines(filePath);
  const content = lines.join('\n');
  const file = relative(filePath);
  const findings: ReviewFinding[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (/waitForTimeout\s*\(/.test(line)) {
      findings.push({
        severity: 'high',
        category: 'Hard wait',
        file,
        line: lineNumber,
        message: 'Uses waitForTimeout, which creates flaky and slow tests.',
        suggestion: 'Replace with Playwright auto-waiting, expect assertions, or waitForLoadState.',
      });
    }

    for (const { pattern, label } of BRITTLE_LOCATOR_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          severity: 'medium',
          category: 'Brittle locator',
          file,
          line: lineNumber,
          message: `Uses a potentially brittle ${label}.`,
          suggestion: 'Prefer getByRole, getByLabel, getByPlaceholder, or getByTestId.',
        });
      }
    }

    if (/test\s*\(/.test(line) && !/expect\s*\(/.test(content)) {
      findings.push({
        severity: 'high',
        category: 'Missing assertion',
        file,
        line: lineNumber,
        message: 'Test block appears to have no expect() assertions.',
        suggestion: 'Add explicit assertions for user-visible outcomes.',
      });
    }

    if (/page\.(locator|getByRole|getByText|getByLabel|getByPlaceholder)\(/.test(line) && file.startsWith('tests/')) {
      findings.push({
        severity: 'medium',
        category: 'Direct locator in test',
        file,
        line: lineNumber,
        message: 'Test uses a direct locator instead of a page object helper.',
        suggestion: 'Move locator logic into the relevant page object and call a semantic method.',
      });
    }
  });

  if (/test\s*\([^)]*\)\s*,\s*async/.test(content)) {
    const testCount = (content.match(/\btest\s*\(/g) ?? []).length;
    const stepCount = (content.match(/\bawait\b/g) ?? []).length;
    if (testCount === 1 && stepCount >= 12) {
      findings.push({
        severity: 'medium',
        category: 'Large test',
        file,
        message: 'Single test performs many steps and may be doing too much.',
        suggestion: 'Split into focused tests or reusable helper methods.',
      });
    }
  }

  const duplicateLogin = (content.match(/loginPage\.login\(/g) ?? []).length;
  if (duplicateLogin >= 2) {
    findings.push({
      severity: 'low',
      category: 'Repeated code',
      file,
      message: 'Login flow is repeated in multiple tests.',
      suggestion: 'Extract a shared beforeEach or authenticated fixture.',
    });
  }

  if (/test\s*\(\s*['"`]test['"`]/.test(content) || /test\s*\(\s*['"`]it works['"`]/.test(content)) {
    findings.push({
      severity: 'low',
      category: 'Poor naming',
      file,
      message: 'Test title is vague and not behavior-focused.',
      suggestion: 'Rename tests to describe expected user behavior.',
    });
  }

  return findings;
}

function buildReport(findings: ReviewFinding[]): string {
  const grouped = {
    high: findings.filter((f) => f.severity === 'high'),
    medium: findings.filter((f) => f.severity === 'medium'),
    low: findings.filter((f) => f.severity === 'low'),
  };

  const lines: string[] = [
    '# Test Review Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Files scanned: ${TARGET_DIRS.map((d) => `\`${d}/\``).join(', ')}`,
    `Findings: ${findings.length}`,
    '',
    '## Summary',
    '',
    `- High: ${grouped.high.length}`,
    `- Medium: ${grouped.medium.length}`,
    `- Low: ${grouped.low.length}`,
    '',
    'This report lists suggested improvements only.',
    '',
    '## Copilot next step',
    '',
    'In VS Code Copilot Chat (Agent mode), type: `/review-playwright-tests`',
    '',
  ];

  for (const severity of ['high', 'medium', 'low'] as const) {
    const items = grouped[severity];
    lines.push(`## ${severity.charAt(0).toUpperCase()}${severity.slice(1)} severity`);
    lines.push('');

    if (items.length === 0) {
      lines.push('- No findings.');
      lines.push('');
      continue;
    }

    items.forEach((finding, index) => {
      lines.push(`### ${index + 1}. ${finding.category} — \`${finding.file}\`${finding.line ? `:${finding.line}` : ''}`);
      lines.push('');
      lines.push(`- **Issue:** ${finding.message}`);
      lines.push(`- **Suggestion:** ${finding.suggestion}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}

function main(): void {
  const files = TARGET_DIRS.flatMap((dir) => listTypeScriptFiles(path.join(ROOT, dir)));
  const findings = files.flatMap(scanFile);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, buildReport(findings), 'utf8');

  console.log(`Report: reports/test-review-report.md (${findings.length} findings)`);
  console.log('Next: open VS Code and type /review-playwright-tests');
}

main();
