# Application knowledge (SauceDemo demo)

Optional context for this demo project. TestPilot AI does not require this file.

## Application

- Public demo store (SauceDemo). Base URL is in `playwright.config.ts`.

## Test users

| User | Password | Notes |
| --- | --- | --- |
| `standard_user` | `secret_sauce` | Valid user for happy-path flows |
| `locked_out_user` | `secret_sauce` | Account locked; login should fail |
| `invalid_user` | any | Not a valid account |

## Expected behaviour

- Successful login redirects to inventory titled **Products**.
- Invalid credentials show: *Username and password do not match any user in this service*
- Adding an item updates the cart badge count.
- Checkout completion shows **Thank you for your order!**

## Open product questions

- **Order confirmation receipt**: Unclear whether itemized subtotal/tax belongs on the order-complete screen or only checkout overview (`.summary-subtotal` exists there). Route as **inspect-source** — fixer needs user approval before changing test or app.

## App source

**Required for RCA.** Provide the application repository link or path in the same message when asking to investigate failures.

## Known limitations

- Shared demo environment; occasional slowness under load.
