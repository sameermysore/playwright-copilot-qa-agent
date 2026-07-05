import { expect, type Locator, type Page } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly cartLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('.title');
    this.cartLink = page.locator('.shopping_cart_link');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.pageTitle).toHaveText('Products');
  }

  async addItemToCart(itemName: string): Promise<void> {
    const addButton = this.page.locator('.inventory_item')
      .filter({ hasText: itemName })
      .getByRole('button', { name: 'Add to cart' });
    await addButton.click();
  }

  async getCartBadgeCount(): Promise<string | null> {
    return this.cartLink.locator('.shopping_cart_badge').textContent();
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
