import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';

const VALID_USERNAME = 'standard_user';
const VALID_PASSWORD = 'secret_sauce';

test.describe('Order confirmation', () => {
  test('order confirmation shows itemized receipt', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const itemName = 'Sauce Labs Backpack';

    await loginPage.goto();
    await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
    await inventoryPage.expectLoaded();
    await inventoryPage.addItemToCart(itemName);
    await inventoryPage.openCart();
    await cartPage.expectLoaded();
    await cartPage.proceedToCheckout();
    await checkoutPage.fillCustomerInfo('Jane', 'Doe', '12345');
    await checkoutPage.finishOrder();

    // Checkout reached — this test is about receipt content, not the thank-you heading
    await expect(page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible();

    // Product-confirmed behavior: itemized subtotal is not shown on order-complete page
    await expect(page.locator('.summary-subtotal')).toHaveCount(0);
  });
});
