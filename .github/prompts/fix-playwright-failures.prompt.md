---
name: fix-playwright-failures
description: Fix failed Playwright tests. Fix only AUTO_FIX_CANDIDATE items.
agent: agent
---

Read [reports/failure-context.md](../../reports/failure-context.md).

If `reports/manual-review-required.md` lists any tests, read that too — ask before fixing those.

Use the [playwright-failure-fixer](../skills/playwright-failure-fixer/SKILL.md) skill.

The user already ran `npm test` and `npm run prepare:failures`. **Do not run those again.**

- Fix `AUTO_FIX_CANDIDATE` directly in code
- For `MANUAL_REVIEW_REQUIRED`: add `// to be manually reviewed` in the test block, explain, and ask before fixing
- Do **not** run `npm test`
- Do **not** create memory or notes files
- After fixing, **you** run `npm run test:failed` in the terminal to validate
- Write a readable fix report in **reports/fix-reports/** (test name + file + why + what changed)
