# Playwright JSON report parsing

Read this when building `failure-report.md` and `failed-tests.json` from the Playwright JSON report.

## Source file

Read the JSON report path configured in the project's Playwright reporter (commonly `reports/playwright-report.json`). It is produced after a full test run via **playwright-test-runner**.

Top-level shape:

```json
{
  "suites": [ /* nested suite tree */ ],
  "stats": { "unexpected": 0 }
}
```

## Walk the suite tree

Suites nest recursively. Each suite may have:

| Field | Use |
| --- | --- |
| `title` | Part of the full test name |
| `file` | Relative spec file path |
| `specs` | Leaf tests in this suite |
| `suites` | Child describe blocks |

Algorithm (pseudocode):

```
failures = []
function walk(suite, parentTitles = []):
  titles = parentTitles + (suite.title ? [suite.title] : [])
  suiteFile = suite.file ?? "unknown"

  for spec in suite.specs ?? []:
    for test in spec.tests ?? []:
      for result in test.results ?? []:
        if result.status in ("failed", "timedOut"):
          failures.push({
            testName: titles.join(" > ") + " > " + spec.title,
            testTitle: last segment of testName,
            testFile: resolve relative path from suiteFile,
            attachments: result.attachments
          })

  for child in suite.suites ?? []:
    walk(child, titles)
```

## Resolve test file path

`suite.file` is often a basename or path relative to the Playwright `testDir`. Resolve to a repo-relative path by checking what exists on disk — do not assume a fixed folder name.

## Extract artifact paths from attachments

Each failed `result.attachments` entry has `name` and `path`. Map by name:

| Attachment name | Field in failed-tests.json |
| --- | --- |
| `error-context` | `errorContext` |
| `screenshot` | `screenshot` |
| `trace` | `trace` |
| `video` | `video` |

Convert absolute paths to repo-relative (forward slashes).

Fallbacks when a named attachment is missing:

- Screenshot: first attachment with `contentType` containing `image`
- Trace: first attachment whose `path` ends with `.zip`

## Build test title strings

| Field | Meaning |
| --- | --- |
| `testName` (full) | `<describe> > … > <spec title>` joined with ` > ` |
| `testTitle` (short) | Last ` > ` segment of `testName` |

Use `testTitle` in `failure-report.md` headings and `-g` grep args.

## Example: one failed test

Generic Playwright JSON fragment:

```json
{
  "title": "<spec title>",
  "tests": [{
    "results": [{
      "status": "failed",
      "attachments": [
        { "name": "screenshot", "path": "<absolute-or-relative-path>" },
        { "name": "error-context", "path": "<absolute-or-relative-path>" },
        { "name": "trace", "path": "<absolute-or-relative-path>" },
        { "name": "video", "path": "<absolute-or-relative-path>" }
      ]
    }]
  }]
}
```

Produces:

**failure-report.md** (one entry):

```markdown
## 1. <testTitle>

- **File:** `<resolved testFile>`
- **Error context:** `<repo-relative errorContext path or not available>`
```

**failed-tests.json** (one failure):

```json
{
  "testName": "<describe> > <testTitle>",
  "testFile": "<resolved relative path>",
  "testTitle": "<testTitle>",
  "errorContext": "<repo-relative path>",
  "screenshot": "<repo-relative path or empty>",
  "trace": "<repo-relative path or empty>",
  "video": "<repo-relative path or empty>"
}
```

Then read `errorContext` for `# Error details`, page snapshot, and test source.

## Build playwrightArgs for rerun

| Failures | playwrightArgs |
| --- | --- |
| 0 | `[]` |
| 1 | `["<testFile>", "-g", "<testTitle>"]` |
| 2+ | `[...unique testFiles, "-g", "<title1>|<title2>|…"]` |

Escape regex special characters in each title when building the combined grep pattern: `. * + ? ^ $ { } ( ) | [ ] \`

Set `validateCommand` in `failed-tests.json` to the project's failed-test rerun script (commonly `npm run test:failed`).

## Zero failures

Still create the session and write empty reports:

- `failure-report.md` → `Total failures: 0` plus a note that no failures were found
- `failed-tests.json` → `"count": 0`, `"failures": []`, `"playwrightArgs": []`

Stop after Phase 1 — no classification needed.
