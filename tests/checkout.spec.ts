import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';

const VALID_USERNAME = 'standard_user';
const VALID_PASSWORD = 'secret_sauce';

test.describe('Checkout', () => {
  test('complete checkout flow for a single item', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const itemName = 'Sauce Labs Bolt T-Shirt';

    await loginPage.goto();
    await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
    await inventoryPage.expectLoaded();
    await inventoryPage.addItemToCart(itemName);
    await inventoryPage.openCart();
    await cartPage.expectLoaded();

    await cartPage.expectItemVisible(itemName);

    await cartPage.proceedToCheckout();
    await checkoutPage.fillCustomerInfo('Jane', 'Doe', '12345');
    await checkoutPage.finishOrder();
    await checkoutPage.expectOrderComplete();
  });
});
