---
name: playwright-fixer
description: Applies fixes for Playwright test failures from RCA output and validates with reruns. Use when the user says fix it, fix the tests, apply fixes, repair failures, or go ahead and fix after RCA. Not for investigation-only requests.
---

# Playwright Fixer

Act, validate, and document. **Never change files silently** — every edit must appear in `<session dir>/fixer-report.md` before you move on.

Requires **playwright-rca** output in the active session. Read [latest](../../../ai-reports/latest) first.

## Inputs

| File | Role |
| --- | --- |
| `failure-report.md` | Failure index (created by RCA) |
| `failed-tests.json` | Artifact paths + rerun args |
| `diagnosis.json` | Structured classification |
| `root-cause-report.md` | Human-readable RCA |

## Phase 1 — Load

1. Read `ai-reports/latest`. Missing → ask user to run **playwright-rca** first.
2. Read all four input files above. Zero failures in `failure-report.md` → stop.
3. Initialize `<session dir>/fixer-report.md`:

```markdown
# Fixer Report

Generated: <ISO-8601>
Session: <session-id>

```

## Phase 2 — Fix (two paths only)

Process each failure from `diagnosis.json` by `recommendedAction`.

### Path A — auto-fix

Use when RCA routed `auto-fix`. Minimal context: `failure-report.md`, matching `error-context.md`, and the failing test / page object.

1. State the planned change in `fixer-report.md` **before** editing.
2. Fix the test or page object.
3. Record `actionTaken` in `diagnosis.json`.
4. Append the per-failure block (template below).

### Path B — inspect-source

Use when RCA routed `inspect-source`. Read `root-cause-report.md` and use `diagnosis.json` → `sourceRepo` (always set by RCA).

1. Confirm or refine the root cause in source code.
2. **Present the proposed source fix to the user and wait for explicit approval.** Do not edit source without approval.
3. **If approved:**
   - Document the planned changes in `fixer-report.md` first.
   - Fix application source, then test/page object if needed.
   - Record `actionTaken` in `diagnosis.json`.
4. **If denied:**
   - Do not edit source or test.
   - Record in `fixer-report.md`: fix suggested, permission denied, test not fixed.
   - Set `actionTaken` to `Fix suggested; source change not approved` in `diagnosis.json`.

Append the per-failure block in both outcomes.

## Per-failure block (append to fixer-report.md)

```markdown
## <test title>

- **Input failure:** <from failure-report.md>
- **RCA said:** <summary + recommendedAction from root-cause-report.md>
- **Fix applied:** <none | test-only | source + test>
- **Files changed:**
  - `<path>` — <what changed and why>
- **User approval:** <not required | granted | denied>
- **Validation:** <pending — filled in Phase 3>
- **Outcome:** <fixed | not fixed — permission denied | not fixed — other>
```

## Phase 3 — Validate

After code changes for any failure, run **playwright-test-runner** in **failed** mode.

Re-read `ai-reports/latest` (same session). Re-read `<session dir>/failure-report.md` (refreshed by the test runner).

Patch `validation` per failure in `diagnosis.json`:

```json
"validation": {
  "ranAt": "<ISO-8601 from failure-report.md>",
  "passed": true,
  "remainingFailures": []
}
```

Update the **Validation** and **Outcome** lines in `fixer-report.md` for each failure you attempted.

Do not run test commands outside **playwright-test-runner**.

## Hard rules

- Document every file change in `fixer-report.md` with what, why, and validation result.
- Source repo changes require explicit user approval.
- Test-only auto-fixes do not require approval.
- Do not reclassify failures — follow RCA `recommendedAction`.
- Do not skip `fixer-report.md` entries for failures you touched or attempted.

## Finish

Summarize outcomes from `fixer-report.md`. Ask: **"Would you like an HTML investigation report?"**

- Yes → use the **generate-rca-report** skill.
- No → stop. `fixer-report.md` and `diagnosis.json` are the record.
