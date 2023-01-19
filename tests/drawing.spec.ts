import { test, expect } from '@playwright/test';
import { login } from './global-setup';

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('add symbol', async ({ page }) => {
  await page.locator('mat-list-item', { hasText: 'e2e test' }).getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button').filter({ hasText: 'stars' }).click();
  await page.getByRole('cell', { name: 'ABC Dekontaminationsstelle' }).click();
  await page.locator('canvas').click({
    position: {
      x: 659,
      y: 257,
    },
  });
  await expect(page.getByText('ABC Dekontaminationsstelle')).toBeVisible();
});
