---
name: generate-rca-report
description: Renders diagnosis.json into rca-report.html. Use when the user asks for an HTML report, RCA report, or generate report after investigation or fixes.
---

# Generate RCA Report

Requires `<session dir>/diagnosis.json` from **playwright-rca** and **playwright-fixer** (validation fields). Read [latest](../../../ai-reports/latest) for the session dir.

## Steps

1. Confirm `<session dir>/diagnosis.json` exists.
2. Run with #tool:execute — **do not hand-write HTML**:

```bash
npm run render:rca
```

3. Tell the user the report is at `<session dir>/rca-report.html`.

The script **replaces the entire file** from the template. Never edit or append to `rca-report.html` manually — that causes duplicate documents.

Generate once per user request.
