---
name: qa-test-case-generator
description: Generate manual test cases from requirements/login-requirement.md and reports/test-case-context.md. Use after npm run prepare:test-cases.
---

# QA Test Case Generator

## Steps

1. Read [requirements/login-requirement.md](../../requirements/login-requirement.md)
2. Read [reports/test-case-context.md](../../reports/test-case-context.md)
3. Write manual test cases in Markdown (not Playwright code)
4. Include: happy path, negative, edge, validation, regression scenarios

## Template for each test case

```markdown
### TC-LOGIN-001: Title here

- **Preconditions:** ...
- **Test Data:** ...
- **Steps:** 1. ... 2. ...
- **Expected Result:** ...
- **Priority:** High
- **Type:** Functional
- **Notes:** ...
```

Save output to `reports/manual-test-cases.md` unless the user asks otherwise.
