---
name: playwright-failure-fixer
description: Fix failed Playwright tests using reports/failure-context.md. Fix only AUTO_FIX_CANDIDATE failures. Use after npm test and npm run prepare:failures.
---

# Playwright Failure Fixer

## Read this file only

[reports/failure-context.md](../../reports/failure-context.md)

Also read [reports/manual-review-required.md](../../reports/manual-review-required.md) when it lists tests — those need human review before Copilot changes code.

Do **not** look for `copilot-action-prompt.md` — it is not part of this POC.

## Commands already run by the user

Do **not** repeat these — context is ready:

- `npm test`
- `npm run prepare:failures`

## Validation — Copilot runs this

After applying fixes, **you** (Copilot) run in the terminal:

```bash
npm run test:failed
```

Do **not** run `npm test` or `npm run prepare:failures` for validation.

## Steps

1. Read the failure report
2. Check **Decision**, **Rationale**, and **Suggested action** for each failure
3. If `AUTO_FIX_CANDIDATE`: fix the test/page code directly — do not ask for approval
4. If `MANUAL_REVIEW_REQUIRED`:
   - Add `// to be manually reviewed` as the first line inside that test block (skip if already present)
   - Do **not** change test or page code yet
   - Explain the issue and ask before fixing
5. Do **not** create memory files or extra notes
6. Run `npm run test:failed` in the terminal to validate your fixes
7. Write a short readable report for the engineer (see below)

## Report for the engineer

After validating, write a plain-language report in **reports/fix-reports/** so anyone can understand what went wrong and what was fixed.

**Goal:** readable by a person — plain English, no jargon unless necessary.

**Filename:** pick something obvious from the test, e.g. `reports/fix-reports/login-successful-login.md`

**Must include:**

- The **test name** (full title)
- The **test file** that was fixed (e.g. `tests/login.spec.ts`)
- **Why it was failing** — explain in simple terms, not just the Playwright error
- **What you changed** — which files and what you fixed
- **Whether it passes now** — result of `npm run test:failed`

Example (adjust to the actual failure):

```markdown
# Test fix report

**Test:** successful login redirects to inventory page
**File:** tests/login.spec.ts

## Why it was failing

This test is supposed to check a successful login, but it was logging in with
invalid credentials (INVALID_USERNAME / INVALID_PASSWORD). Login failed, so the
inventory page never loaded and the test timed out waiting for "Products".

## What we changed

In tests/login.spec.ts, replaced invalid credentials with valid ones
(standard_user / secret_sauce).

## Result

Ran npm run test:failed — test passed.
```

One file per fixed test. Write so a teammate who did not run the tests can still follow it.

## Decisions

| Decision | What to do |
| --- | --- |
| AUTO_FIX_CANDIDATE | Fix in test/page code, then validate |
| MANUAL_REVIEW_REQUIRED | Add `// to be manually reviewed` in the test, explain, wait for approval |
