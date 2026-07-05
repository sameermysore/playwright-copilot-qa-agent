Generated reports appear here when you run:

- `npm test` → `playwright-report.json` (Playwright JSON reporter)
- `npm run prepare:failures` → `failure-context.md`, `manual-review-required.md`, `failed-tests.json`
- `npm run prepare:review` → `test-review-report.md`
- `npm run prepare:test-cases` → `test-case-context.md`

Copilot may also write:

- `manual-test-cases.md` during test case generation
- `fix-reports/*.md` after fixing failures (plain-language report for engineers)

## Reset before a demo

```bash
npm run demo:clean
```

Removes all generated files above (plus HTML report, fix-reports, test-results). Keeps this README and source code unchanged.
