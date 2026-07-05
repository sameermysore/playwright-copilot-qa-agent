# Playwright Copilot QA Agent (POC)

Small demo project for **GitHub Copilot Agent Mode** + **Playwright**.

Copilot does the thinking. This repo prepares the context Copilot needs.

## How it works

```text
1. You run Playwright tests (npm test)
2. Playwright writes reports/playwright-report.json
3. You run a prepare command to build Copilot context
4. You type a slash command in VS Code Copilot Chat
5. Copilot reads the report + skill and does the work
```

No Copilot API. Everything runs in VS Code with your Copilot subscription.

## Folder map

```text
tests/              Playwright tests (SauceDemo)
pages/              Page objects
requirements/       User story for test case generation
scripts/            4 small scripts that build reports
reports/            Generated reports (created when you run prepare:*)
.github/
  copilot-instructions.md   Global QA rules for Copilot
  skills/                   3 skills (one per task)
  prompts/                  3 slash commands for Copilot Chat
```

## Setup

```bash
npm install
npx playwright install chromium
```

Open in **VS Code**, enable **Copilot Chat → Agent mode**.

## The 3 workflows

### 1. Fix failed tests

```bash
npm test
npm run prepare:failures
```

In Copilot Chat:

```text
/fix-playwright-failures
```

Copilot fixes code and validates with `npm run test:failed` only — it should **not** re-run `npm test`.

Copilot writes a readable report in **reports/fix-reports/** — test name, file, why it failed, what changed, pass/fail.

Validate yourself if needed:

```bash
npm run test:failed
```

Step 1 runs Playwright and writes `reports/playwright-report.json` (via the JSON reporter in `playwright.config.ts`).
Step 2 reads that report and writes `reports/failure-context.md` for Copilot.

Reads: `reports/failure-context.md`, `reports/manual-review-required.md` (if any need review)  
Writes: `reports/fix-reports/*.md` (readable fix report)

---

### 2. Review test quality

```bash
npm run prepare:review
```

In Copilot Chat:

```text
/review-playwright-tests
```

Reads: `reports/test-review-report.md`

---

### 3. Generate manual test cases

Before the demo (optional reset):

```bash
npm run demo:clean
```

During the demo:

```bash
npm run prepare:test-cases
```

In Copilot Chat:

```text
/generate-test-cases
```

Copilot writes **`reports/manual-test-cases.md`**.

Reads: `reports/test-case-context.md` and `requirements/login-requirement.md`

---

## Commands cheat sheet

| Terminal | Copilot slash | Purpose |
| --- | --- | --- |
| `npm test` then `npm run prepare:failures` | `/fix-playwright-failures` | Fix failing tests safely |
| `npm run prepare:review` | `/review-playwright-tests` | Review test quality |
| `npm run prepare:test-cases` | `/generate-test-cases` | Generate manual test cases |
| `npm run demo:clean` | — | Clear generated reports before a demo |
| `npm test` | — | Run all Playwright tests |
| `npm run test:failed` | — | Re-run only failed tests |

## Key ideas

- **Framework** = scripts + reports (prepares context)
- **Agent** = GitHub Copilot in VS Code
- **Skill** = step-by-step instructions in `.github/skills/`
- **AUTO_FIX_CANDIDATE** = safe for Copilot to fix
- **MANUAL_REVIEW_REQUIRED** = Copilot should explain, not blindly patch

## Sample app

Tests run against [SauceDemo](https://www.saucedemo.com/): login, cart, checkout.
