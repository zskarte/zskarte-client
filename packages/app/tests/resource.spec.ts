import { test, expect, Locator, Page } from '@playwright/test';
import path from 'path';
import { login } from './util';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'resource-small.csv');

function overviewDialog(page: Page): Locator {
  return page.locator('mat-dialog-container').filter({ has: page.getByRole('heading', { name: 'Mittelübersicht' }) });
}

function importDialog(page: Page): Locator {
  return page.locator('mat-dialog-container').filter({ has: page.getByRole('heading', { name: /Bestand importieren/ }) });
}

function deployDialog(page: Page): Locator {
  return page.locator('mat-dialog-container').filter({ has: page.getByRole('heading', { name: 'Mittel platzieren' }) });
}

async function openResourceOverview(page: Page) {
  await page.getByRole('button', { name: 'Kartenmenü' }).click();
  await page.getByRole('menuitem', { name: 'Mittelübersicht' }).click();
  await expect(overviewDialog(page)).toBeVisible();
}

/** Article-number cell followed by the Bestand and Frei cells, in that order. */
function catalogueRow(page: Page, articleNumber: string): Locator {
  return overviewDialog(page).locator('tr', { hasText: articleNumber });
}

/**
 * Serial with one shared page: the catalogue of a local (guest) operation lives in
 * IndexedDB, which is per browser context. A fresh context per test would start from an
 * empty catalogue, so the import in the second test would not be visible to the later ones.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Mittelübersicht', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
    await page.locator('mat-list-item', { hasText: 'e2e test' }).first().click();
    const nameDialog = page.getByRole('dialog');
    await nameDialog.getByRole('textbox').fill('Guest');
    await nameDialog.getByRole('button', { name: 'OK' }).click();
    await page.waitForSelector('#map', { state: 'visible' });
    await page.waitForTimeout(500);
    await openResourceOverview(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('shows the three tabs and the empty state before any import', async () => {
    const dialog = overviewDialog(page);
    await expect(dialog.getByRole('tab', { name: 'Katalog' })).toBeVisible();
    await expect(dialog.getByRole('tab', { name: 'Im Einsatz' })).toBeVisible();
    await expect(dialog.getByRole('tab', { name: 'Formationen' })).toBeVisible();
    await expect(dialog.getByText('Noch kein Bestand geladen')).toBeVisible();
  });

  test('imports the CSV fixture and lists the three articles', async () => {
    const dialog = overviewDialog(page);
    await dialog.getByRole('button', { name: 'CSV importieren' }).click();

    const importD = importDialog(page);
    await expect(importD).toBeVisible();
    await importD.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);
    await importD.getByRole('button', { name: 'Einlesen' }).click();

    // Preview step: 6 rows / 3 articles, as parsed from the fixture.
    await expect(importD.getByText(/Gelesen:\s*6\s*Zeilen\s*·\s*3\s*Artikel/)).toBeVisible();

    await importD.getByRole('button', { name: 'Import ausführen' }).click();
    await expect(importD).not.toBeVisible();

    // Back in the catalogue: count line and the three imported articles.
    await expect(dialog.getByText(/^3 von 3 Artikel · 6 Stück$/)).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'ZM-000001', exact: true })).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'ZM-000002', exact: true })).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'ZM-000003', exact: true })).toBeVisible();
  });

  test('filters the catalogue by article name', async () => {
    const dialog = overviewDialog(page);
    await dialog.getByLabel('Suchen').fill('Stromaggregat');

    await expect(dialog.getByText(/^1 von 3 Artikel · 2 Stück$/)).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'ZM-000001', exact: true })).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'ZM-000002', exact: true })).not.toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'ZM-000003', exact: true })).not.toBeVisible();

    await dialog.getByRole('button', { name: 'Filter leeren' }).click();
    await expect(dialog.getByText(/^3 von 3 Artikel · 6 Stück$/)).toBeVisible();
  });

  test('shows reduced availability for an article under repair', async () => {
    const row = catalogueRow(page, 'ZM-000003');
    // Bestand (total stock) is 1, Frei (available) is 0 - the one piece is "in Reparatur".
    await expect(row.getByRole('cell').nth(5)).toHaveText('1');
    await expect(row.getByRole('cell').nth(6)).toHaveText('0');
  });

  test('places a resource on the map and reflects it in Im Einsatz', async () => {
    const dialog = overviewDialog(page);
    const row002 = catalogueRow(page, 'ZM-000002');

    await expect(row002.getByRole('cell').nth(6)).toHaveText('3');
    await row002.getByRole('checkbox').click();
    await expect(dialog.getByText('3 Mittel ausgewählt')).toBeVisible();

    await dialog.getByRole('button', { name: 'Auf Karte platzieren' }).click();

    const deployD = deployDialog(page);
    await expect(deployD).toBeVisible();
    await deployD.getByRole('radio', { name: /Sammel-Standort/ }).check();
    await deployD.getByLabel('Bezeichnung').fill('Sammelplatz Warnwesten');
    await deployD.getByRole('button', { name: 'Am Kartenzentrum platzieren' }).click();
    await expect(deployD).not.toBeVisible();

    // Placed pieces show up under "Im Einsatz" ...
    await dialog.getByRole('tab', { name: 'Im Einsatz' }).click();
    const deployedRow = dialog.locator('tr', { hasText: 'Sammelplatz Warnwesten' });
    await expect(deployedRow).toBeVisible();
    await expect(deployedRow).toContainText('Warnweste Zivilschutz L');

    // ... and the catalogue now shows the article as fully assigned.
    await dialog.getByRole('tab', { name: 'Katalog' }).click();
    await expect(row002.getByRole('cell').nth(6)).toHaveText('0');
  });
});
