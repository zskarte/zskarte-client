import { chromium, FullConfig, Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('./login');
  await page.getByRole('button', { name: 'Login als Gast' }).click();
  await page.getByRole('button', { name: 'Bestätigen' }).click();
}

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  await login(page);
  await page.getByText('Ereignis auswählen').waitFor();
  await page.getByRole('button', { name: 'Neues Ereignis' }).click();
  await page.getByText('Bearbeiten').waitFor();
  await page.getByPlaceholder('Name eingeben').fill('e2e test');
  await page.getByPlaceholder('Beschreibung eingeben').fill('e2e test');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.context().storageState({ path: storageState as string });
  await browser.close();

  // Teardown, remove operation
  return async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ baseURL });
    await login(page);
    await page.getByText('Ereignis auswählen').waitFor();
    await page.locator('mat-list-item', { hasText: 'e2e test' }).getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Ereignis umbenennen' }).click();
    await page.getByText('Bearbeiten').waitFor();
    await page.getByRole('button', { name: 'Löschen' }).click();
  };
}

export default globalSetup;
