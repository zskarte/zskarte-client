import { test, expect } from '@playwright/test';
import { login } from './global-setup';

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.locator('mat-list-item', { hasText: 'e2e test' }).first().click();
  await page.getByRole('button', { name: 'OK' }).click();
});

test('add symbol', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Signatur' }).click();
  await page.getByRole('cell', { name: 'ABC Dekontaminationsstelle' }).click();
  await page.locator('canvas').click({
    position: {
      x: 659,
      y: 257,
    },
  });
  await expect(page.locator('app-selected-feature > mat-card')).toBeVisible();
  await expect(page.getByText('ABC Dekontaminationsstelle')).toBeVisible();
});

test('add polygon', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Polygon' }).click();
  await page.locator('canvas').click({
    position: {
      x: 341,
      y: 163,
    },
  });
  await page.locator('canvas').click({
    position: {
      x: 350,
      y: 180,
    },
  });
  await page.locator('canvas').click({
    position: {
      x: 340,
      y: 180,
    },
  });
  await page.locator('canvas').dblclick({
    position: {
      x: 341,
      y: 163,
    },
  });
  await expect(page.locator('app-selected-feature > mat-card')).toBeVisible();
});

test('add line', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Linie' }).click();
  await page.locator('canvas').click({
    position: {
      x: 706,
      y: 593,
    },
  });
  await page.locator('canvas').dblclick({
    position: {
      x: 1002,
      y: 493,
    },
  });
  await expect(page.locator('app-selected-feature > mat-card')).toBeVisible();
});

test('add text', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Text' }).click();
  await page.getByPlaceholder('Ihr Text').fill('A TEST');
  await page.getByRole('button', { name: 'OK' }).click();
  await page.locator('canvas').click({
    position: {
      x: 704,
      y: 418,
    },
  });
  await page.locator('canvas').dblclick({
    position: {
      x: 659,
      y: 409,
    },
  });
  await expect(page.locator('app-selected-feature > mat-card')).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('A TEST');
});
