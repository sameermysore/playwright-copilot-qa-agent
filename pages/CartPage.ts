import { expect, type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('.title');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.pageTitle).toHaveText('Your Cart');
  }

  async expectItemVisible(itemName: string): Promise<void> {
    await expect(this.page.locator('.inventory_item_name', { hasText: itemName })).toBeVisible();
  }

  async proceedToCheckout(): Promise<void> {
    await Promise.all([
      this.page.waitForURL(/checkout-step-one\.html/),
      this.checkoutButton.click(),
    ]);
  }
}
