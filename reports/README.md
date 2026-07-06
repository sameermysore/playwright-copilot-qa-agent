# Reports

## Playwright output (from `npm test`)

- `playwright-report.json` — raw JSON input for failure collection
- `html/` — Playwright HTML report (`npx playwright show-report reports/html`)

## Investigation output (agent workflow)

All investigation artifacts live in **`investigation/`**:

| File | Created by |
| --- | --- |
| `investigation/failure-report.md` | `npm test` (automatic) |
| `investigation/failed-tests.json` | agent runs `collect:failures` |
| `investigation/rca-report.html` | agent after RCA (open in browser) |
| `investigation/manual-review.md` | agent when cause is unclear |

HTML template for the agent: `.github/templates/rca-report.html`

Clear generated files with `npm run demo:clean`.
