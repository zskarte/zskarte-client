import { ResourceArticle, ResourceAssignment, ResourceItem } from '@zskarte/types';
import { describe, expect, it } from 'vitest';
import { ResourceAssignmentIndex } from './resource-assignments';
import { appendResourceAssignment, buildResourceAddOptions, canAssignOption } from './resource-assignment-picker';

function article(overrides: Partial<ResourceArticle> = {}): ResourceArticle {
  return {
    articleNumber: 'ZM-0001',
    name: 'Stromaggregat',
    articleGroup: 'Energie',
    articleType: 'ZSO Material',
    serialized: false,
    totalCount: 3,
    inStockCount: 3,
    items: [item(), item(), item()],
    ...overrides,
  };
}

function item(overrides: Partial<ResourceItem> = {}): ResourceItem {
  return {
    status: 'an Lager',
    ...overrides,
  };
}

function emptyIndex(): ResourceAssignmentIndex {
  return { byArticle: new Map(), byItemKey: new Map() };
}

function index(quantity: number, itemKeys: string[] = [], articleNumber = 'ZM-0001'): ResourceAssignmentIndex {
  return {
    byArticle: new Map([[articleNumber, { quantity, elementIds: ['el-1'] }]]),
    byItemKey: new Map(itemKeys.map((itemKey) => [itemKey, 'el-1'])),
  };
}

describe('buildResourceAddOptions', () => {
  it('pools the interchangeable pieces of an article into one free option', () => {
    const options = buildResourceAddOptions([article()], emptyIndex(), '');
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ articleNumber: 'ZM-0001', state: 'free', count: 3 });
    expect(options[0].itemKey).toBeUndefined();
  });

  it('splits a pool into what is deployed and what is still free', () => {
    const options = buildResourceAddOptions([article()], index(2), '');
    expect(options.map((option) => [option.state, option.count])).toEqual([
      ['free', 1],
      ['deployed', 2],
    ]);
  });

  it('still offers a piece the inventory does not list as in stock, with its status', () => {
    const damaged = article({
      serialized: true,
      totalCount: 1,
      inStockCount: 0,
      items: [item({ status: 'in Reparatur', serialNumber: 'AG-7', itemKey: 'ZM-0001|AG-7' })],
    });

    const options = buildResourceAddOptions([damaged], emptyIndex(), '');
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ state: 'notInStock', status: 'in Reparatur', serialNumber: 'AG-7' });
    expect(canAssignOption(options[0])).toBe(true);
  });

  it('lists serialised pieces individually and marks the assigned ones as deployed', () => {
    const serialised = article({
      serialized: true,
      totalCount: 2,
      inStockCount: 2,
      items: [
        item({ serialNumber: 'A1', itemKey: 'ZM-0001|A1' }),
        item({ serialNumber: 'A2', itemKey: 'ZM-0001|A2' }),
      ],
    });

    const options = buildResourceAddOptions([serialised], index(1, ['ZM-0001|A1']), '');
    expect(options.map((option) => [option.serialNumber, option.state])).toEqual([
      ['A2', 'free'],
      ['A1', 'deployed'],
    ]);
    expect(canAssignOption(options[1])).toBe(false);
  });

  it('does not double-count a deployed serialised piece against the pool', () => {
    const mixed = article({
      serialized: true,
      totalCount: 3,
      inStockCount: 3,
      items: [item({ serialNumber: 'A1', itemKey: 'ZM-0001|A1' }), item(), item()],
    });

    const options = buildResourceAddOptions([mixed], index(1, ['ZM-0001|A1']), '');
    expect(options.map((option) => [option.serialNumber, option.state, option.count])).toEqual([
      [undefined, 'free', 2],
      ['A1', 'deployed', 1],
    ]);
  });

  it('matches the search term against article number, name, manufacturer, serial number and status', () => {
    const articles = [
      article({ articleNumber: 'ZM-0001', name: 'Stromaggregat', manufacturer: 'Honda' }),
      article({
        articleNumber: 'ZM-0002',
        name: 'Anhänger ZS',
        serialized: true,
        totalCount: 1,
        inStockCount: 0,
        items: [item({ status: 'in Reparatur', serialNumber: 'AG-7', itemKey: 'ZM-0002|AG-7' })],
      }),
    ];

    expect(buildResourceAddOptions(articles, emptyIndex(), 'strom').map((o) => o.articleNumber)).toEqual(['ZM-0001']);
    expect(buildResourceAddOptions(articles, emptyIndex(), 'honda').map((o) => o.articleNumber)).toEqual(['ZM-0001']);
    expect(buildResourceAddOptions(articles, emptyIndex(), 'anhänger').map((o) => o.articleNumber)).toEqual(['ZM-0002']);
    expect(buildResourceAddOptions(articles, emptyIndex(), 'ag-7').map((o) => o.serialNumber)).toEqual(['AG-7']);
    expect(buildResourceAddOptions(articles, emptyIndex(), 'reparatur').map((o) => o.articleNumber)).toEqual(['ZM-0002']);
    expect(buildResourceAddOptions(articles, emptyIndex(), 'nothing')).toHaveLength(0);
  });

  it('sorts free before unavailable before deployed, then by name, and caps at the limit', () => {
    const articles = [
      article({ articleNumber: 'ZM-0003', name: 'Zelt' }),
      article({ articleNumber: 'ZM-0002', name: 'Absperrband', inStockCount: 0, items: [item({ status: 'ausgeliehen' })] }),
      article({ articleNumber: 'ZM-0001', name: 'Motorsäge' }),
    ];

    expect(buildResourceAddOptions(articles, emptyIndex(), '').map((o) => o.name)).toEqual([
      'Motorsäge',
      'Zelt',
      'Absperrband',
    ]);
    expect(buildResourceAddOptions(articles, emptyIndex(), '', 2)).toHaveLength(2);
  });
});

describe('appendResourceAssignment', () => {
  const fungible = { article: article(), articleNumber: 'ZM-0001', name: 'Stromaggregat', state: 'free' as const, count: 2 };
  const serialised = {
    article: article(),
    articleNumber: 'ZM-0001',
    name: 'Stromaggregat',
    itemKey: 'ZM-0001|A1',
    serialNumber: 'A1',
    state: 'free' as const,
    count: 1,
  };

  it('appends a first assignment without mutating the input', () => {
    const items: ResourceAssignment[] = [];
    const next = appendResourceAssignment(items, fungible);
    expect(next).toEqual([{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1 }]);
    expect(items).toHaveLength(0);
  });

  it('bumps the quantity of an existing fungible record instead of appending a second one', () => {
    const items: ResourceAssignment[] = [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 2 }];
    expect(appendResourceAssignment(items, fungible)).toEqual([
      { articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 3 },
    ]);
    expect(items[0].quantity).toBe(2);
  });

  it('keeps a serialised piece separate from the article s fungible record', () => {
    const items: ResourceAssignment[] = [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1 }];
    expect(appendResourceAssignment(items, serialised)).toEqual([
      { articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1 },
      { articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1, serialNumber: 'A1', itemKey: 'ZM-0001|A1' },
    ]);
  });

  it('never assigns the same serialised piece twice', () => {
    const items = appendResourceAssignment([], serialised);
    expect(appendResourceAssignment(items, serialised)).toEqual(items);
  });
});
