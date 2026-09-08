// Pure module, no Angular TestBed involved — import the globals explicitly (vitest `globals` is not enabled repo-wide).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { aggregateResourceArticles, slugifyArticleName } from './resource-aggregate';
import { parseResourceCsv } from './resource-csv.parser';

function loadFixtureBuffer(): ArrayBuffer {
  const path = new URL('../testing/resource-fixture.csv', import.meta.url);
  const nodeBuffer = readFileSync(path);
  return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength) as ArrayBuffer;
}

function aggregateFixture() {
  const parsed = parseResourceCsv(loadFixtureBuffer());
  expect(parsed.errors).toEqual([]);
  return aggregateResourceArticles(parsed.rows);
}

function byNumber(articles: ReturnType<typeof aggregateFixture>['articles'], articleNumber: string) {
  const article = articles.find((a) => a.articleNumber === articleNumber);
  expect(article).toBeDefined();
  return article!;
}

describe('slugifyArticleName', () => {
  it('lowercases, trims and collapses whitespace to dashes while keeping umlauts', () => {
    expect(slugifyArticleName('Beingummi pro Stück')).toBe('beingummi-pro-stück');
  });

  it('collapses multiple internal spaces', () => {
    expect(slugifyArticleName('  Foo   Bar  ')).toBe('foo-bar');
  });
});

describe('aggregateResourceArticles (fixture)', () => {
  it('produces 7 articles and 15 items total', () => {
    const { articles } = aggregateFixture();
    expect(articles.length).toBe(7);
    expect(articles.reduce((sum, a) => sum + a.totalCount, 0)).toBe(15);
  });

  it('emits one aggregated emptyName warning', () => {
    const { warnings } = aggregateFixture();
    const emptyName = warnings.find((w) => w.code === 'emptyName');
    expect(emptyName).toBeDefined();
    expect(emptyName!.count).toBe(1);
  });

  it('counts 2 rows as syntheticNumber', () => {
    const { warnings } = aggregateFixture();
    const synthetic = warnings.find((w) => w.code === 'syntheticNumber');
    expect(synthetic).toBeDefined();
    expect(synthetic!.count).toBe(2);
  });

  it('ZM-000680 "Stromaggregat Kirsch": 3 items, all in stock, serialized, deterministic itemKeys with #2 on the higher serialNumberInternal', () => {
    const { articles } = aggregateFixture();
    const article = byNumber(articles, 'ZM-000680');
    expect(article.name).toBe('Stromaggregat "Kirsch"');
    expect(article.totalCount).toBe(3);
    expect(article.inStockCount).toBe(3);
    expect(article.serialized).toBe(true);
    expect(article.items.map((i) => i.itemKey)).toEqual(['ZM-000680|SN-1', 'ZM-000680|SN-2', 'ZM-000680|SN-2#2']);
    const dup2 = article.items.find((i) => i.itemKey === 'ZM-000680|SN-2#2');
    expect(dup2?.serialNumberInternal).toBe('14');
  });

  it('ZM-000057 "Anhänger ZS": 2 items, 1 in stock (one in Reparatur), comment keeps the newline', () => {
    const { articles } = aggregateFixture();
    const article = byNumber(articles, 'ZM-000057');
    expect(article.totalCount).toBe(2);
    expect(article.inStockCount).toBe(1);
    expect(article.items[0].comment).toBe('AG 719 186\nWeisse Nummer');
  });

  it('ZM-001577: 3 items, not serialized, no itemKeys', () => {
    const { articles } = aggregateFixture();
    const article = byNumber(articles, 'ZM-001577');
    expect(article.totalCount).toBe(3);
    expect(article.serialized).toBe(false);
    expect(article.items.every((i) => i.itemKey === undefined)).toBe(true);
  });

  it('~beingummi-pro-stück: 2 items, syntheticNumber true', () => {
    const { articles } = aggregateFixture();
    const article = byNumber(articles, '~beingummi-pro-stück');
    expect(article.totalCount).toBe(2);
    expect(article.syntheticNumber).toBe(true);
  });

  it('ZM-000552: name picks the most frequent spelling, other spelling becomes a nameVariant', () => {
    const { articles } = aggregateFixture();
    const article = byNumber(articles, 'ZM-000552');
    expect(article.name).toBe('Regenjacke 52/56');
    expect(article.nameVariants).toEqual(['Regenjacke52/56']);
  });

  it('ZM-000582: storageLocation2 is omitted (the "#VALUE!" normalisation)', () => {
    const { articles } = aggregateFixture();
    const article = byNumber(articles, 'ZM-000582');
    expect(article.items[0].storageLocation2).toBeUndefined();
  });

  it('ZM-000015: sealed, purchaseDate, unit and coordinates are parsed correctly', () => {
    const { articles } = aggregateFixture();
    const article = byNumber(articles, 'ZM-000015');
    const item = article.items[0];
    expect(item.sealed).toBe(true);
    expect(item.purchaseDate).toBe('2024-12-09');
    expect(article.unit).toBe('Liter');
    expect(item.coordinates?.[0]).toBeCloseTo(47.547959470582526, 9);
    expect(item.coordinates?.[1]).toBeCloseTo(7.767585683309598, 9);
  });

  it('sorts the output by articleNumber ascending', () => {
    const { articles } = aggregateFixture();
    const numbers = articles.map((a) => a.articleNumber);
    const sorted = [...numbers].sort((a, b) => a.localeCompare(b));
    expect(numbers).toEqual(sorted);
  });

  it('is deterministic: aggregating the same parsed rows twice yields deeply equal results', () => {
    const parsed = parseResourceCsv(loadFixtureBuffer());
    const first = aggregateResourceArticles(parsed.rows);
    const second = aggregateResourceArticles(parsed.rows);
    expect(second).toEqual(first);
  });

  it('never stores empty-string optional fields on items — they are omitted instead', () => {
    const { articles } = aggregateFixture();
    for (const article of articles) {
      for (const item of article.items) {
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'string' && key !== 'status') {
            expect(value).not.toBe('');
          }
        }
      }
    }
  });
});

/**
 * End-to-end over the downloadable template: what someone gets when they fill it in must
 * aggregate into a usable catalogue - otherwise the example teaches the wrong thing.
 */
describe('shipped example template', () => {
  function aggregateExample() {
    const path = new URL('../../../assets/doc/resource/mittel-beispiel.csv', import.meta.url);
    const nodeBuffer = readFileSync(path);
    const buffer = nodeBuffer.buffer.slice(
      nodeBuffer.byteOffset,
      nodeBuffer.byteOffset + nodeBuffer.byteLength,
    ) as ArrayBuffer;
    const parsed = parseResourceCsv(buffer);
    return aggregateResourceArticles(parsed.rows);
  }

  it('aggregates into four articles without warnings about unusable cells', () => {
    const { articles, warnings } = aggregateExample();
    expect(articles.map((a) => a.articleNumber)).toEqual(['ZM-000001', 'ZM-000002', 'ZM-000003', 'ZM-000004']);
    expect(warnings.filter((warning) => warning.code !== 'syntheticNumber')).toEqual([]);
  });

  it('shows a serialised article, an interchangeable one and a piece that is not in stock', () => {
    const { articles } = aggregateExample();
    const byNumber = new Map(articles.map((article) => [article.articleNumber, article]));

    // three generators, one of them "in Reparatur"
    expect(byNumber.get('ZM-000001')).toMatchObject({ serialized: true, totalCount: 3, inStockCount: 2 });
    // three warning vests without serial numbers - a pure quantity
    expect(byNumber.get('ZM-000002')).toMatchObject({ serialized: false, totalCount: 3, inStockCount: 3 });
    // the group that maps to its own pictogram
    expect(byNumber.get('ZM-000003')?.articleGroup).toBe('Transport/Logistik');
    expect(byNumber.get('ZM-000004')?.articleGroup).toBe('Sanitätsmaterial');
  });
});
