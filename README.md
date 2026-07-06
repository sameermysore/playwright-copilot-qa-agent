# Playwright Failure Investigation Agent

Investigate and fix Playwright test failures with **TestPilot AI** — a skill-based Copilot agent for VS Code.

## What you need

This repo contains the **Playwright tests** and the **AI agent**. It does **not** include your application source code.

| Requirement | Why |
| --- | --- |
| **Application source code** | Keep the app repo on your machine (sibling folder, clone, or any local path). The agent reads it during RCA and may propose source fixes. |
| **Application reachable at `baseURL`** | Tests use `playwright.config.ts` → `use.baseURL`. Point this at a **deployed URL** or **localhost** — either works. Running the app locally is optional. |
| **Source path in chat** | RCA **will not start** without it. Paste the app repo path or link in the same message when you ask for investigation. |

Example layout:

```text
qa-agent/
  playwright-copilot-qa-agent/   ← this repo (tests + agent)
  sample-app-web/                ← your app source (separate repo/folder)
```

## Quick start

### 1. Install

```bash
npm install
npx playwright install chromium
```

### 2. Point tests at your application

Set `use.baseURL` in `playwright.config.ts` to wherever your app runs:

| Setup | `baseURL` example | Notes |
| --- | --- | --- |
| **Deployed / hosted** | `https://your-app.example.com` | No local server needed |
| **Local** | `http://localhost:3000` | Run `npm start` in your app repo first |

You do not need a local server if the app is already deployed. Local development is fine too — pick what matches your environment.

### 3. Open Copilot Agent

1. Copilot Chat → **Agent** mode (not Ask).
2. Select **TestPilot AI** from the agents dropdown.
3. **Configure Tools** → enable **Terminal** / **Run in Terminal**.
4. Set permissions to **Autopilot** or **Bypass Approvals** (`.vscode/settings.json` auto-approves test commands).

### 4. Run the workflow

Ask the agent directly — you do not need to run `npm test` yourself:

```text
You:  "Run tests"
      → playwright-test-runner

You:  "Please check the failures. Source: ../sample-app-web"
      → playwright-rca  (source path required — agent stops if missing)

You:  "Fix the failures"
      → playwright-fixer

You:  "Generate HTML report"          (optional)
      → generate-rca-report
```

**RCA prompt template** — copy and edit the path:

```text
Please check the failures. Source repo: <path-to-your-app>
```

Examples:

- `../sample-app-web`
- `c:\Users\samee\qa-agent\sample-app-web`
- `https://github.com/your-org/your-app` (if cloned locally, prefer the local path)

## Workflow

```text
playwright-test-runner (all)
        ↓
playwright-rca  ← requires source repo path in your message
        ↓
playwright-fixer
        ↓
playwright-test-runner (failed)  ← validates fixes
        ↓
generate-rca-report (optional)
```

| Step | You say | Agent skill |
| --- | --- | --- |
| Run tests | "Run tests" | **playwright-test-runner** |
| Investigate | "Please check…" + **source path** | **playwright-rca** |
| Fix | "Fix the failures" | **playwright-fixer** |
| Report | "HTML report" | **generate-rca-report** |

## Project layout

```text
.github/
  agents/TestPilotAI.agent.md
  skills/
    playwright-test-runner/
    playwright-rca/
    playwright-fixer/
    generate-rca-report/
  knowledge/                    ← optional app context for classification
  demo-failures.md              ← demo seed bugs (humans only)
scripts/
  run-failed-tests.ts           ← rerun failures from RCA session
  render-rca-report.ts          ← HTML report
  demo-clean.ts
  lib/
tests/
pages/
reports/                        ← Playwright output (gitignored)
ai-reports/                     ← agent output (gitignored)
  latest
  <session-id>/
    failure-report.md
    failed-tests.json
    diagnosis.json
    root-cause-report.md
    fixer-report.md
    rca-report.html             ← optional
```

## Commands

| Command | Who runs it | Purpose |
| --- | --- | --- |
| `npm test` | Agent (test-runner) | Full Playwright suite |
| `npm run test:failed` | Agent (test-runner) | Re-run RCA failures + refresh session reports |
| `npm run render:rca` | Agent | Build `rca-report.html` |
| `npm run demo:clean` | You or agent | Clear generated reports |

## Optional knowledge

Add `.github/knowledge/application.md` to improve classification (expected UI text, open product questions, etc.). See `.github/knowledge/README.md`. Not required for the agent to run.

## Demo

See **[.github/demo-failures.md](.github/demo-failures.md)** for intentional seed bugs and expected outcomes.

| Test | Expected outcome |
| --- | --- |
| Login — successful login | Auto-fix (`Product` → `Products`) |
| Checkout — complete checkout | Auto-fix page object locator |
| Order confirmation — itemized receipt | Inspect-source — needs your approval; include source path in RCA |

Prepare demo data:

```bash
npm run demo:clean
# Set seed bugs per demo-failures.md, then ask agent: "Run tests"
# For local demo: start app on baseURL first. For deployed app: set baseURL accordingly.
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Agent won't run terminal commands | Agent mode + TestPilot AI + Terminal tool enabled |
| RCA asks for source repo | Paste app path in the same message: `Source: ../your-app` |
| All tests fail with connection refused | App not reachable at `baseURL` — start it locally or use a deployed URL in `playwright.config.ts` |
| "No active session" on test:failed | Run RCA first — it creates the `ai-reports/` session |
