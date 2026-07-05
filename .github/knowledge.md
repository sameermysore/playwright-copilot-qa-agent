# Project Knowledge

Application-specific facts for the QA agent. Scripts do not read this file — the agent reads it during investigation.

## Application

- Public demo store used for E2E tests (SauceDemo).
- Base URL is configured in `playwright.config.ts`.

## Test users

| User | Password | Notes |
| --- | --- | --- |
| `standard_user` | `secret_sauce` | Valid user for happy-path flows |
| `locked_out_user` | `secret_sauce` | Account is locked; login should fail with locked-out message |
| `invalid_user` | any | Not a valid account |

## Expected behaviour

- Successful login redirects to the inventory page titled **Products**.
- Invalid credentials show an error: *Username and password do not match any user in this service*
- Adding an item to cart updates the cart badge count.
- Checkout completion shows a thank-you message: **Thank you for your order!**

## Core workflows

1. Login → inventory (Products page)
2. Add item to cart → open cart → proceed to checkout
3. Fill customer info → finish order → order complete screen

## Open product questions

- **Order confirmation receipt**: It is unclear whether itemized subtotal/tax should appear on the order-complete screen, or only on the checkout overview step (where `.summary-subtotal` exists today). Do not change the test or the app without product confirmation — mark for manual review.

## App source code

Optional: set `APP_REPO_PATH` in `.env` (see `.env.example`) to point at the application repository. For this demo, use `APP_REPO_PATH=../sample-app-web`.

The agent inspects application source **only** when test-side RCA is not confident. Run `npm run resolve:app-repo` to verify the path resolves.

## Known limitations

- Shared demo environment; occasional slowness under load.
- Demo accounts and copy are fixed but external UI text could change.
