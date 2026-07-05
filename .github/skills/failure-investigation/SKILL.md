---
name: failure-investigation
description: Investigate failed Playwright tests with RCA. Fix test/page/app code only when cause is clear. Use when user asks to fix or investigate failures.
---

# Failure Investigation

Use when the user asks to investigate or fix Playwright failures after `npm test`.

## Step 1 — Read the failure report

Read [reports/investigation/failure-report.md](../../reports/investigation/failure-report.md).

If missing, ask the user to run **`npm test`** only.

If zero failures, stop — all passed.

## Step 2 — Read knowledge.md and test code

1. [knowledge.md](../knowledge.md) — especially **Open product questions**
2. Test files and page objects from the report
3. Full test body including assertions after the failing line

## Step 3 — Root Cause Analysis (before any edit)

Per failure: what failed, evidence, root cause, confidence, why.

Open product question in knowledge.md → **unclear** → manual review, do not fix.

## Step 3b — Optional application source inspection (fallback only)

Run this **only** when Step 3 confidence is **not high**, or the root cause remains unclear after reviewing the failure report, tests, and page objects.

Do **not** skip the normal test-side analysis in Steps 2–3. Do **not** inspect app source when confidence is already high.

1. Run with #tool:execute:

```bash
npm run resolve:app-repo
```

2. If the command exits non-zero or prints nothing, **stop here** — continue with the existing unclear → manual-review behaviour. No warnings, no errors, no behaviour change.

3. If a path is printed, treat it as the application repository root (`APP_REPO_PATH`). Search that tree for evidence related to the failure:
   - locators, `data-testid`, roles, labels, button text
   - routes, navigation, page structure
   - components and UI copy referenced in the error or test code

   Discover values dynamically from source — do not assume application-specific paths, selectors, or business logic.

4. Update the RCA for each failure with:
   - what failed
   - why it failed
   - evidence found (test artifacts + app source)
   - **application source inspected:** yes (include repo path) or no
   - **issue owner:** test / application / unclear
   - what changes were made (or manual review)
   - confidence level

5. Re-evaluate the Step 5 action table using the new evidence. Apply fixes only where appropriate (test update, locator change, page object, or app fix when clearly warranted).

## Step 4 — Write RCA HTML

**Overwrite** [reports/investigation/rca-report.html](../../reports/investigation/rca-report.html) with one complete HTML document from [.github/templates/rca-report.html](../templates/rca-report.html).

Never append a second `<!DOCTYPE html>` block. Each write replaces the entire file. After validation, rewrite the full file with an updated Validation section — do not patch or append.

Copy timestamps from `failure-report.md`:
- Header `<time datetime="...">` → `Generated:` line (exact ISO, e.g. `2026-07-06T03:17:42.123Z`)
- Validation `<time datetime="...">` → `Generated:` line from the report **after** `npm run test:failed`

The page script formats those ISO values as local date + time when opened.

## Step 5 — Act

| Root cause | Confidence | Action |
| --- | --- | --- |
| test / test data / locator / page object | high | Fix |
| app source | high | Fix if clear |
| open product question | any | manual-review.md only |
| unclear | any | manual-review.md only |

## Step 6 — Validate (run this yourself)

After fixes, run with #tool:execute:

```bash
npm run test:failed
```

Then read the updated [failure-report.md](../../reports/investigation/failure-report.md) and **rewrite the entire** rca-report.html with updated validation content.

Do not ask the user to run this command.
