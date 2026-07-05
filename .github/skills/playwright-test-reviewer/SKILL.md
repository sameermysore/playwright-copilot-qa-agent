---
name: playwright-test-reviewer
description: Review Playwright tests for maintainability using reports/test-review-report.md. Use after npm run prepare:review.
---

# Playwright Test Reviewer

## Steps

1. Read [reports/test-review-report.md](../../reports/test-review-report.md)
2. Inspect the listed files in `tests/` and `pages/`
3. Suggest or apply small improvements — do not rewrite everything
4. Watch for: hard waits, brittle locators, missing assertions, duplicated login code
5. If you change code, run `npm test`
6. Summarize findings and changes
