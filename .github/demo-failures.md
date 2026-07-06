# Demo intentional failures

Reference for preparing the TestPilot AI demo.  
Scripts do not read this file — it is for humans only.

## Before demo

1. Set the three seed bugs below (manual edits to tests/page objects).
2. Run `npm run demo:clean` to clear old Playwright and `ai-reports/` output.
3. Ask the agent: **"Run tests"** (`playwright-test-runner` runs `npm test` — do not run it yourself).

Expect **3 failures** and **2 passing** (`cart.spec.ts`, invalid login). Ensure the app is reachable at `baseURL` in `playwright.config.ts` (default is hosted saucedemo — no local `npm start` needed unless you point at localhost).

When asking for RCA, include the source repo path (required), e.g. `../sample-app-web`.

### 1. Login — `tests/login.spec.ts`

```typescript
await expect(page.locator('[data-test="title"]')).toHaveText('Product');
```

### 2. Checkout — `pages/CheckoutPage.ts`

```typescript
this.completeHeader = page.getByRole('heading', { name: 'Order complete' });
```

Keep `finishButton` as `'Finish'` — order-confirmation needs checkout to complete.

### 3. Order confirmation — `tests/order-confirmation.spec.ts`

```typescript
await expect(page.locator('.summary-subtotal')).toBeVisible();
```

Keep `.github/knowledge/application.md` — open product question routes this as inspect-source.

---

## After demo — what changes vs what stays

| # | Test | Agent should change | Must retain |
| --- | --- | --- | --- |
| 1 | Login — successful login | `login.spec.ts`: `'Product'` → `'Products'` | Invalid login test, `LoginPage.ts`, app |
| 2 | Checkout — complete checkout | `CheckoutPage.ts` `completeHeader` → `'Thank you for your order!'` | `checkout.spec.ts`, `finishButton`, other page objects |
| 3 | Order confirmation — itemized receipt | `fixer-report.md`: permission denied or inspect-source only | **Test, app, and knowledge unchanged** unless user approves source fix |

---

## Artifacts

| Artifact | After demo |
| --- | --- |
| `ai-reports/<session-id>/diagnosis.json` | 3 entries; 2 auto-fix, 1 inspect-source |
| `ai-reports/<session-id>/root-cause-report.md` | RCA for all 3 failures |
| `ai-reports/<session-id>/fixer-report.md` | Audit trail for fix attempts |
| `ai-reports/<session-id>/failure-report.md` | 1 remaining failure |
| `ai-reports/<session-id>/rca-report.html` | Optional — only if user requested HTML |
