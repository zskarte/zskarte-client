import { chromium, FullConfig, Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('./login');
  await page.getByRole('button', { name: 'Login als Gast' }).click();
  await page.getByRole('button', { name: 'Bestätigen' }).click();
  await page.waitForResponse(/api\/operations/);
}

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  // const browser = await chromium.launch();
  // const page = await browser.newPage({ baseURL });
  // await login(page);
  // await page.getByRole('button', { name: 'Neues Ereignis' }).click();
  // await page.getByText('Bearbeiten').waitFor();
  // await page.getByPlaceholder('Name eingeben').fill('e2e test');
  // await page.getByPlaceholder('Beschreibung eingeben').fill('e2e test');
  // await page.getByTestId('operation-save').click();
  // await page.waitForResponse(/api\/operations/);
  // await browser.close();

  // Teardown, remove operation
  return async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ baseURL });
    await login(page);
    await page.locator('.operation-list-item', { hasText: 'e2e test' }).first().getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Ereignis löschen' }).click();
  };
}

export default globalSetup;
