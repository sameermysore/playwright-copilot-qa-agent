import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';

const VALID_USERNAME = 'standard_user';
const VALID_PASSWORD = 'secret_sauce';

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
  });

  test('add item to cart updates cart badge', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const itemName = 'Sauce Labs Backpack';

    await inventoryPage.expectLoaded();
    await inventoryPage.addItemToCart(itemName);

    await expect(await inventoryPage.getCartBadgeCount()).toBe('1');

    await inventoryPage.openCart();
    await cartPage.expectLoaded();
    await cartPage.expectItemVisible(itemName);
  });
});
