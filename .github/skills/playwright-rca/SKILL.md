---
name: playwright-rca
description: Investigates Playwright failures and writes root cause analysis. Use when the user says please check, investigate, analyze failures, root cause, or RCA after tests have run. Requires a source repository link or path in the same message — stop and ask if missing.
---

# Playwright RCA

Analysis only — **do not edit test, page-object, or application source files**. Hand off to **playwright-fixer** when the user wants fixes.

## Phase 0 — Source repository (required)

RCA does **not** start without a source repo. The user must provide a link or local path in chat (URL, folder path, or repo root).

1. If no source repo was given → **stop**. Reply:

   > RCA needs the application source repository. Please provide a link or path (e.g. `../sample-app-web` or `c:\path\to\app`), then ask again.

2. Confirm the path exists or is reachable before continuing.
3. Store the value — you will write it to `diagnosis.json` → `sourceRepo` and `root-cause-report.md`.

Do not guess paths, read `APP_REPO_PATH`, or infer from open editor tabs.

## Session layout

Each run writes artifacts under `ai-reports/<session-id>/`. **`ai-reports/latest`** points at the active session (you create both in Phase 1).

| File | Role |
| --- | --- |
| `failure-report.md` | **You create** — index of failed tests |
| `failed-tests.json` | **You create** — artifact paths + rerun args |
| `diagnosis.json` | **You create** — structured classification |
| `root-cause-report.md` | **You create** — human-readable RCA |
| `fixer-report.md` | Written later by **playwright-fixer** |
| `rca-report.html` | Optional HTML (`npm run render:rca`) |

## Phase 1 — Ingest Playwright reports

Read **only** Playwright-native output. Do not read `failure-report.md` or `failed-tests.json` as input — you create those files here.

For JSON parsing, attachment mapping, and `playwrightArgs` rules, see [reference.md](reference.md).

1. Confirm `reports/playwright-report.json` exists. Missing → run **playwright-test-runner** (all mode) first.
2. Create a new session:
   - Session id: local time `HH-mm_dd-mm-yyyy` (e.g. `19-44_06-07-2026`).
   - Directory: `ai-reports/<session-id>/`
   - Write `ai-reports/latest` with one line: `ai-reports/<session-id>`
3. Parse `reports/playwright-report.json`. Collect every test with `status` `failed` or `timedOut`.
4. For each failure, resolve from attachments:
   - `error-context` → path under `test-results/`
   - `screenshot`, `trace`, `video` when present
5. Read each `error-context.md` for error details, page snapshot, and test source.
6. Write `<session dir>/failure-report.md`:

```markdown
# Failure Report

Generated: <ISO-8601>
Total failures: <n>

Index of failed tests. Read each Playwright `error-context.md` for evidence.
Screenshot, trace, video paths and rerun args: `failed-tests.json`.

## 1. <test title>

- **File:** `<relative test file>`
- **Error context:** `<path or not available>`
```

7. Write `<session dir>/failed-tests.json`:

```json
{
  "generated": "<ISO-8601>",
  "count": 0,
  "failures": [{
    "testName": "<full suite > title>",
    "testFile": "tests/example.spec.ts",
    "testTitle": "<short title>",
    "errorContext": "test-results/.../error-context.md",
    "screenshot": "",
    "trace": "",
    "video": ""
  }],
  "validateCommand": "npm run test:failed",
  "playwrightArgs": ["tests/example.spec.ts", "-g", "<test title>"]
}
```

Use a single `-g` arg per file when one failure; combine files and grep pattern when multiple. Zero failures → stop after writing empty reports.

8. **Optional knowledge** — read the first file that exists; if none, continue:
   - [.github/knowledge/application.md](../knowledge/application.md)
   - [.github/knowledge.md](../knowledge.md) (legacy)
9. Read failing tests and page objects referenced in the failure index.

## Phase 2 — Classify

Write `<session dir>/diagnosis.json` — one entry per failure:

```json
{
  "generated": "<ISO-8601>",
  "sourceRepo": "<user-provided link or path — required>",
  "failures": [{
    "testTitle": "",
    "testFile": "",
    "classification": "locator | timing | application-bug | environment | test-data | assertion | unknown",
    "confidence": "high | medium | low",
    "summary": "",
    "evidence": [],
    "owner": "test | application | unclear",
    "recommendedAction": "auto-fix | inspect-source",
    "actionTaken": null,
    "validation": null
  }]
}
```

Routing rules:

| Situation | recommendedAction |
| --- | --- |
| Locator, test-data, assertion, timing (test-side) with high confidence | `auto-fix` |
| Application bug, unclear owner, open product question, or needs source confirmation | `inspect-source` |
| Environment flake | `auto-fix` if rerun likely helps; otherwise `inspect-source` |

Open product questions in knowledge → `inspect-source` (document uncertainty; do not fix here).

## Phase 3 — Investigate source

Use the source repo from Phase 0 for **every** failure.

### inspect-source failures

1. Search the repo for routes, components, and UI copy from the error and snapshot.
2. Update `summary`, `evidence`, `owner`, and `classification` with findings.
3. If root cause is clear → document what must change in source (and test if needed).
4. If root cause is uncertain or fix is complicated → document uncertainty; keep `inspect-source`.

### auto-fix failures

1. Cross-check the repo briefly — confirm UI copy, selectors, or components match the test-side diagnosis.
2. If source contradicts the auto-fix classification → reclassify to `inspect-source` and document why.
3. Record source findings in `root-cause-report.md` (even if confirming test-side fix).

Do not edit any repository files in this phase.

## Phase 4 — Root cause report

Write `<session dir>/root-cause-report.md`:

```markdown
# Root Cause Analysis

Generated: <ISO-8601>
Session: <session-id>
Source repo: <link or path from Phase 0>

## <test title>

- **File:** `<test file>`
- **Classification:** <classification> (<confidence> confidence)
- **Owner:** <test | application | unclear>
- **Recommended action:** <auto-fix | inspect-source>
- **Summary:** <one paragraph>
- **Evidence:**
  - <bullet>
- **Source findings:** <what you found in source repo>
- **Suggested fix:** <concrete next step for playwright-fixer, or "fix test/page object directly">
```

## Finish

Tell the user RCA is complete and list the session path. Ask whether to run **playwright-fixer** to apply fixes.
