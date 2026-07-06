# Playwright Failure Investigation Agent

Investigate and fix Playwright test failures with agentic RCA.

## Workflow

```text
You:   npm test
You:   investigate failed test     → TestPilot AI reads report, RCA, fixes
Agent: npm run test:failed         → validates + refreshes failure-report.md
Agent: updates rca-report.html
```

You only run **`npm test`**. TestPilot AI runs **`npm run test:failed`** after fixes.

## Copilot setup (required for terminal)

TestPilot AI is built for **GitHub Copilot in VS Code**. For the agent to run commands itself:

1. **Agent mode** — in Copilot Chat, pick **Agent** (not Ask / Chat).
2. **Select TestPilot AI** — agents dropdown → **TestPilot AI** (loads `.github/agents/TestPilotAI.agent.md`).
3. **Terminal tool enabled** — click **Configure Tools** in chat → ensure **Terminal** / **Run in Terminal** is checked.
4. **Permissions** — set session to **Autopilot** or **Bypass Approvals** (permissions dropdown in chat input). `.vscode/settings.json` auto-approves `npm test` and `npm run test:failed`.

**Common mistake:** an old agent config used `tools: ['terminal']`. Copilot’s alias is **`execute`**, not `terminal` — invalid names are ignored, so the agent got no shell. The agent now declares `tools: ['read', 'edit', 'search', 'execute']`.

If Copilot still says *"provisioned without a terminal tool"*, you are likely in **Ask mode**, **Configure Tools** has terminal off, or a **subagent/skill fork** session (use TestPilot AI directly in Agent mode).

## Project layout

```text
.github/
  agents/TestPilotAI.agent.md       ← Copilot agent
  skills/failure-investigation/     ← investigation skill
  knowledge.md                      ← project-specific context
  copilot-instructions.md
scripts/
tests/
pages/
reports/
  playwright-report.json            ← from npm test
  html/                             ← Playwright HTML report
  investigation/                    ← all agent investigation output
    failure-report.md
    rca-report.html                 ← pretty RCA (open in browser)
    manual-review.md
    failed-tests.json
```

## Setup

```bash
npm install
npx playwright install chromium
```

VS Code → Copilot Chat → **Agent** mode → select **TestPilot AI** → enable **Terminal** in Configure Tools.

### Optional application repository

To let the agent inspect application source during RCA (fallback when test-side analysis is not confident), set `APP_REPO_PATH` in a `.env` file:

```bash
cp .env.example .env
# APP_REPO_PATH=../development-repo
```

Relative paths resolve from this project root. When unset or the directory does not exist, behaviour is unchanged — no errors or warnings.

Verify configuration:

```bash
npm run resolve:app-repo
```

Prints the resolved path on success; exits silently on failure.

## Commands

| Command | Who | Purpose |
| --- | --- | --- |
| `npm test` | You | Run all tests + refresh failure report |
| `npm run test:failed` | Agent | After fixes — re-run failures + refresh report |
| `npm run resolve:app-repo` | Either | Print `APP_REPO_PATH` when configured (silent otherwise) |
| `npm run demo:clean` | Either | Clear generated reports |

## Demo failures (intentional)

| Test | Expected agent outcome |
| --- | --- |
| `login.spec.ts` — successful login | Fix test (`Product` → `Products`) |
| `checkout.spec.ts` — complete checkout | Fix page object locator |
| `order-confirmation.spec.ts` — itemized receipt | **Manual review** — fails on `.summary-subtotal`; see knowledge.md |
