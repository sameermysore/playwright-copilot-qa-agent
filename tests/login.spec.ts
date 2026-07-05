import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

const INVALID_USERNAME = 'invalid_user';
const INVALID_PASSWORD = 'invalid_password';
const VALID_USERNAME = 'standard_user';
const VALID_PASSWORD = 'secret_sauce';

test.describe('Login', () => {
  test('successful login redirects to inventory page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(VALID_USERNAME, VALID_PASSWORD);

    await expect(page.locator('.title')).toHaveText('Products');
  });

  test('invalid login shows error message', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(INVALID_USERNAME, INVALID_PASSWORD);

    await expect(loginPage.errorMessage).toContainText(
      'Username and password do not match any user in this service'
    );
  });
});
