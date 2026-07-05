# GitHub Copilot Instructions

Act as a senior QA automation engineer.

## Rules

- Fix root cause, not symptoms
- Prefer stable Playwright locators: `getByRole`, `getByLabel`, `getByTestId`
- Reuse page objects in `pages/`
- Make the smallest safe change
- Do not weaken assertions to make tests pass
- Do not add `waitForTimeout`
- For test case generation, write **manual test cases in Markdown**, not automation code unless asked

## Do not create extra files

- Do **not** create Copilot memory files or notes (for example under `/memories/`)
- Do **not** create new markdown files except:
  - `reports/manual-test-cases.md` (test case generation)
  - `reports/fix-reports/*.md` (readable fix report after fixing a test)
- Edit existing test/page files only

## Reports in this POC

| Task | Report to read | Report Copilot writes |
| --- | --- | --- |
| Fix failures | `reports/failure-context.md`, `reports/manual-review-required.md` | `reports/fix-reports/*.md` |
| Review tests | `reports/test-review-report.md` | — |
| Test cases | `reports/test-case-context.md` | `reports/manual-test-cases.md` |

`reports/copilot-action-prompt.md` was removed. Do not look for it.

## Workflows

| Task | Prepare | Slash command | Validate |
| --- | --- | --- | --- |
| Fix failures | `npm test` then `npm run prepare:failures` | `/fix-playwright-failures` | `npm run test:failed` |
| Review tests | `npm run prepare:review` | `/review-playwright-tests` | `npm test` if code changed |
| Test cases | `npm run prepare:test-cases` | `/generate-test-cases` | review output |

For `AUTO_FIX_CANDIDATE` failures: apply the fix directly, then **Copilot** runs `npm run test:failed` in the terminal. Do **not** run `npm test` or `npm run prepare:failures`.
For `MANUAL_REVIEW_REQUIRED` failures: add `// to be manually reviewed` in the test block, explain the issue, and ask before changing code.
