---
name: playwright-test-runner
description: Runs the full Playwright suite or reruns failed tests only. Use when the user says run tests, execute tests, run the suite, rerun failures, validate fixes, or when another skill needs test execution.
---

# Playwright Test Runner

Single entry point for running tests. **Always use this skill** instead of inventing test commands.

## Modes

| Mode | When | Command |
| --- | --- | --- |
| **all** | User asks to run tests; before RCA when no Playwright report exists | `npm test` |
| **failed** | Fixer validation; rerun only failures from the active session | `npm run test:failed` |

## Mode — all

1. Run with #tool:execute:

```bash
npm test
```

2. Playwright writes:
   - `reports/playwright-report.json`
   - `reports/html/`
   - `test-results/` (including `error-context.md` on failures)
3. Report pass/fail counts from terminal output.
4. Does **not** create `ai-reports/` session files — **playwright-rca** does that.

If the user will investigate failures next, tell them to ask for RCA (or offer to run it).

## Mode — failed

Requires an active RCA session with `<session dir>/failed-tests.json`.

1. Confirm `ai-reports/latest` exists and `failed-tests.json` has `count > 0`.
2. Run with #tool:execute:

```bash
npm run test:failed
```

3. Re-read `ai-reports/latest` (same session). `failure-report.md` and `failed-tests.json` are refreshed automatically.
4. Report which tests passed and which still fail.

If `failed-tests.json` is missing → ask user to run **playwright-rca** first.  
If `count` is 0 → tell user there are no failures to rerun.

## Hard rules

- Never ask the user to run test commands — run them yourself.
- Do not refresh session reports outside `npm run test:failed` — it runs automatically after failed reruns.
- Other skills (**playwright-fixer**, etc.) must call this skill for test execution — do not bypass with raw commands.
