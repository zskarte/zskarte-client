import { test } from '@playwright/test';
import { login } from './global-setup';

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('create operation', async ({ page }) => {
  await page.getByRole('button', { name: 'Neues Ereignis' }).click();
  await page.getByText('Bearbeiten').waitFor();
  await page.getByPlaceholder('Name eingeben').fill('e2e test');
  await page.getByPlaceholder('Beschreibung eingeben').fill('e2e test');
  await page.getByTestId('operation-save').click();
  await page.waitForResponse(/api\/operations/);
  await page.waitForTimeout(1000);
});
