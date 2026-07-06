# AI custom reports

Output from **TestPilot AI** — not Playwright native reports.

| Location | Contents |
| --- | --- |
| [`reports/`](../reports/) | Playwright JSON + HTML report |
| [`test-results/`](../test-results/) | Playwright per-test artifacts, including `error-context.md` |

## Session layout

Each investigation run gets its own folder (created by **playwright-rca**):

```text
ai-reports/
  latest                         ← one line: active session dir (RCA skill)
  <session-id>/                  ← HH-mm_dd-mm-yyyy (local time, e.g. 19-44_06-07-2026)
    failure-report.md            ← RCA: index → error-context.md
    failed-tests.json            ← RCA: artifact paths + rerun args
    diagnosis.json               ← RCA: structured classification
    root-cause-report.md         ← RCA: human-readable analysis
    fixer-report.md              ← Fixer: audit trail of changes
    rca-report.html              ← optional (npm run render:rca)
```

`npm test` writes Playwright reports only. **playwright-rca** ingests those and creates the session. `npm run test:failed` refreshes `failure-report.md` and `failed-tests.json` after fixes.

Evidence lives in Playwright `error-context.md`. Session folders do not copy that content.

Clear generated output with `npm run demo:clean` (keeps this README).
