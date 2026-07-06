import { expect, type Locator, type Page } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly finishButton: Locator;
  readonly pageTitle: Locator;
  readonly completeHeader: Locator;
  readonly summarySubtotalLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByPlaceholder('First Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    this.postalCodeInput = page.getByPlaceholder('Zip/Postal Code');
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.finishButton = page.getByRole('button', { name: 'Finish' });
    this.pageTitle = page.locator('.title');
    this.completeHeader = page.getByRole('heading', { name: 'Thank you for your order!' });
    this.summarySubtotalLabel = page.locator('.summary_subtotal_label');
  }

  async fillCustomerInfo(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
    await this.continueButton.click();
  }

  async finishOrder(): Promise<void> {
    await this.finishButton.click();
  }

  async expectReceiptSummaryVisible(): Promise<void> {
    await expect(this.summarySubtotalLabel).toBeVisible();
  }

  async expectOrderComplete(): Promise<void> {
    await expect(this.completeHeader).toBeVisible();
  }
}
