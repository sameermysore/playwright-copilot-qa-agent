import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REQUIREMENT = path.join(ROOT, 'requirements', 'login-requirement.md');
const OUTPUT = path.join(ROOT, 'reports', 'test-case-context.md');

function section(content: string, heading: string): string {
  const match = content.match(new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function bullets(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(\d+\.|[-*])\s+/.test(line))
    .map((line) => line.replace(/^(\d+\.|[-*])\s+/, '').trim());
}

function list(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None';
}

function main(): void {
  const content = fs.readFileSync(REQUIREMENT, 'utf8');

  const report = [
    '# Test Case Context',
    '',
    `Source: requirements/login-requirement.md`,
    '',
    '## Requirement Summary',
    '',
    section(content, 'Requirement Summary') || section(content, 'User Story'),
    '',
    '## Acceptance Criteria',
    '',
    list(bullets(section(content, 'Acceptance Criteria'))),
    '',
    '## Business Rules',
    '',
    list(bullets(section(content, 'Business Rules'))),
    '',
    '## Assumptions',
    '',
    list(bullets(section(content, 'Assumptions'))),
    '',
    '## Risks',
    '',
    list(bullets(section(content, 'Risks'))),
    '',
    '## Copilot next step',
    '',
    'In VS Code Copilot Chat (Agent mode), type: `/generate-test-cases`',
    '',
    'Copilot should write manual test cases with: ID, Title, Preconditions, Test Data, Steps, Expected Result, Priority, Type, Notes.',
    'Include happy path, negative, edge, validation, and regression scenarios.',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, report, 'utf8');

  console.log('Report: reports/test-case-context.md');
  console.log('Next: open VS Code and type /generate-test-cases');
}

main();
