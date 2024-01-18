import { test, expect, Page } from '@playwright/test';
import { login } from './global-setup';

async function clickOnMap(page: Page, position: { x: number; y: number }) {
  await page.waitForTimeout(100);
  await page.locator('#map canvas').last().click({ position });
}

async function dblclickOnMap(page: Page, position: { x: number; y: number }) {
  await page.waitForTimeout(100);
  await page.locator('#map canvas').last().dblclick({ position });
}

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.locator('mat-list-item', { hasText: 'e2e test' }).first().click();
  await page.getByRole('button', { name: 'OK' }).click();
});

test('add symbol', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Signatur' }).click();
  await page.getByRole('cell', { name: 'ABC Dekontaminationsstelle' }).click();
  await clickOnMap(page, { x: 659, y: 250 });
  await expect(page.locator('app-selected-feature > mat-card')).toBeVisible();
  await expect(page.getByText('ABC Dekontaminationsstelle')).toBeVisible();
});

test('add polygon', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Polygon' }).click();
  await clickOnMap(page, { x: 340, y: 160 });
  await clickOnMap(page, { x: 350, y: 180 });
  await clickOnMap(page, { x: 340, y: 180 });
  await dblclickOnMap(page, { x: 340, y: 160 });
  await expect(page.locator('app-selected-feature > mat-card')).toBeVisible();
});

test('add line', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Linie' }).click();
  await clickOnMap(page, { x: 700, y: 400 });
  await dblclickOnMap(page, { x: 700, y: 600 });
  await expect(page.locator('app-selected-feature > mat-card')).toBeVisible();
});

test('add text', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Text' }).click();
  await page.getByPlaceholder('Ihr Text').fill('A TEST');
  await page.getByRole('button', { name: 'OK' }).click();
  await clickOnMap(page, { x: 700, y: 400 });
  await dblclickOnMap(page, { x: 600, y: 400 });
  await expect(page.locator('app-selected-feature > mat-card')).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('A TEST');
});
