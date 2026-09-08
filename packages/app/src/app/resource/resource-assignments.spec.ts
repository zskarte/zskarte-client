import { IZsMapBaseDrawElementState, ResourceArticle, ZsMapDrawElementStateType } from '@zskarte/types';
import { describe, expect, it } from 'vitest';
import { buildResourceAssignmentIndex, computeResourceCatalogueRows, findOrphanedAssignments } from './resource-assignments';

function article(overrides: Partial<ResourceArticle> = {}): ResourceArticle {
  return {
    articleNumber: 'ZM-0001',
    name: 'Stromaggregat',
    articleGroup: 'Energie',
    articleType: 'ZSO Material',
    serialized: false,
    totalCount: 10,
    inStockCount: 10,
    items: [],
    ...overrides,
  };
}

function element(overrides: Partial<IZsMapBaseDrawElementState> = {}): IZsMapBaseDrawElementState {
  return {
    id: 'el-1',
    type: ZsMapDrawElementStateType.SYMBOL,
    ...overrides,
  };
}

describe('buildResourceAssignmentIndex', () => {
  it('returns empty maps when no elements carry resourceItems', () => {
    const index = buildResourceAssignmentIndex([element({ resourceItems: undefined }), element({ id: 'el-2' })]);
    expect(index.byArticle.size).toBe(0);
    expect(index.byItemKey.size).toBe(0);
  });

  it('ignores elements without an id even if they carry resourceItems', () => {
    const index = buildResourceAssignmentIndex([
      element({ id: undefined, resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1 }] }),
    ]);
    expect(index.byArticle.size).toBe(0);
  });

  it('sums quantity across several markers assigning the same article', () => {
    const index = buildResourceAssignmentIndex([
      element({ id: 'el-1', resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 2 }] }),
      element({ id: 'el-2', resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 3 }] }),
    ]);
    const entry = index.byArticle.get('ZM-0001');
    expect(entry?.quantity).toBe(5);
    expect(entry?.elementIds.sort()).toEqual(['el-1', 'el-2']);
  });

  it('does not duplicate an elementId when the same element assigns the article twice', () => {
    const index = buildResourceAssignmentIndex([
      element({
        id: 'el-1',
        resourceItems: [
          { articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1, itemKey: 'ZM-0001|SN1' },
          { articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1, itemKey: 'ZM-0001|SN2' },
        ],
      }),
    ]);
    const entry = index.byArticle.get('ZM-0001');
    expect(entry?.quantity).toBe(2);
    expect(entry?.elementIds).toEqual(['el-1']);
  });

  it('maps a serialised itemKey to its assigning element', () => {
    const index = buildResourceAssignmentIndex([
      element({
        id: 'el-9',
        resourceItems: [{ articleNumber: 'ZM-0002', name: 'Pumpe', quantity: 1, serialNumber: 'SN1', itemKey: 'ZM-0002|SN1' }],
      }),
    ]);
    expect(index.byItemKey.get('ZM-0002|SN1')).toBe('el-9');
  });

  it('resolves a duplicate itemKey to the first assigning element without throwing', () => {
    const index = buildResourceAssignmentIndex([
      element({ id: 'el-1', resourceItems: [{ articleNumber: 'ZM-0002', name: 'Pumpe', quantity: 1, itemKey: 'ZM-0002|SN1' }] }),
      element({ id: 'el-2', resourceItems: [{ articleNumber: 'ZM-0002', name: 'Pumpe', quantity: 1, itemKey: 'ZM-0002|SN1' }] }),
    ]);
    expect(index.byItemKey.get('ZM-0002|SN1')).toBe('el-1');
  });

  it('ignores empty itemKeys', () => {
    const index = buildResourceAssignmentIndex([
      element({ id: 'el-1', resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1 }] }),
    ]);
    expect(index.byItemKey.size).toBe(0);
  });
});

describe('computeResourceCatalogueRows', () => {
  it('preserves input order and reports zero assignment when nothing is placed on the map', () => {
    const articles = [article({ articleNumber: 'A' }), article({ articleNumber: 'B' })];
    const index = buildResourceAssignmentIndex([]);
    const rows = computeResourceCatalogueRows(articles, index);
    expect(rows.map((r) => r.article.articleNumber)).toEqual(['A', 'B']);
    expect(rows[0].assignedCount).toBe(0);
    expect(rows[0].availableCount).toBe(10);
    expect(rows[0].unavailableCount).toBe(0);
    expect(rows[0].availability).toEqual(['available']);
    expect(rows[0].elementIds).toEqual([]);
  });

  it('reports the unavailable bucket for pieces not an Lager', () => {
    const articles = [article({ totalCount: 10, inStockCount: 7 })];
    const rows = computeResourceCatalogueRows(articles, buildResourceAssignmentIndex([]));
    expect(rows[0].unavailableCount).toBe(3);
    expect(rows[0].availableCount).toBe(7);
    expect(rows[0].availability.sort()).toEqual(['available', 'unavailable']);
  });

  it('marks a fully assigned article as assigned and not available', () => {
    const articles = [article({ articleNumber: 'ZM-0001', totalCount: 5, inStockCount: 5 })];
    const index = buildResourceAssignmentIndex([
      element({ id: 'el-1', resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 5 }] }),
    ]);
    const rows = computeResourceCatalogueRows(articles, index);
    expect(rows[0].assignedCount).toBe(5);
    expect(rows[0].availableCount).toBe(0);
    expect(rows[0].availability).toEqual(['assigned']);
    expect(rows[0].elementIds).toEqual(['el-1']);
  });

  it('clamps availableCount at 0 when an article is over-assigned', () => {
    const articles = [article({ articleNumber: 'ZM-0001', totalCount: 5, inStockCount: 5 })];
    const index = buildResourceAssignmentIndex([
      element({ id: 'el-1', resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 8 }] }),
    ]);
    const rows = computeResourceCatalogueRows(articles, index);
    expect(rows[0].assignedCount).toBe(8);
    expect(rows[0].availableCount).toBe(0);
    expect(rows[0].availability).toEqual(['assigned']);
  });

  it('matches several availability buckets at once', () => {
    const articles = [article({ articleNumber: 'ZM-0001', totalCount: 10, inStockCount: 6 })];
    const index = buildResourceAssignmentIndex([
      element({ id: 'el-1', resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 2 }] }),
    ]);
    const rows = computeResourceCatalogueRows(articles, index);
    // inStock 6, assigned 2 -> available 4; totalCount 10 - inStock 6 -> unavailable 4
    expect(rows[0].assignedCount).toBe(2);
    expect(rows[0].availableCount).toBe(4);
    expect(rows[0].unavailableCount).toBe(4);
    expect([...rows[0].availability].sort()).toEqual(['assigned', 'available', 'unavailable']);
  });
});

describe('findOrphanedAssignments', () => {
  it('returns nothing when every assignment still matches the catalogue', () => {
    const articles = [
      article({
        articleNumber: 'ZM-0001',
        serialized: true,
        items: [{ status: 'an Lager', serialNumber: 'SN1', itemKey: 'ZM-0001|SN1' }],
      }),
    ];
    const elements = [
      element({
        id: 'el-1',
        resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1, itemKey: 'ZM-0001|SN1' }],
      }),
    ];
    expect(findOrphanedAssignments(elements, articles)).toEqual([]);
  });

  it('flags an assignment whose article was removed from the catalogue', () => {
    const elements = [
      element({ id: 'el-1', resourceItems: [{ articleNumber: 'ZM-9999', name: 'Gone', quantity: 1 }] }),
    ];
    const orphans = findOrphanedAssignments(elements, []);
    expect(orphans).toEqual([{ elementId: 'el-1', assignment: { articleNumber: 'ZM-9999', name: 'Gone', quantity: 1 } }]);
  });

  it('flags an assignment whose serial number was removed from its article', () => {
    const articles = [
      article({
        articleNumber: 'ZM-0001',
        serialized: true,
        items: [{ status: 'an Lager', serialNumber: 'SN2', itemKey: 'ZM-0001|SN2' }],
      }),
    ];
    const elements = [
      element({
        id: 'el-1',
        resourceItems: [{ articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1, serialNumber: 'SN1', itemKey: 'ZM-0001|SN1' }],
      }),
    ];
    const orphans = findOrphanedAssignments(elements, articles);
    expect(orphans).toEqual([
      {
        elementId: 'el-1',
        assignment: { articleNumber: 'ZM-0001', name: 'Stromaggregat', quantity: 1, serialNumber: 'SN1', itemKey: 'ZM-0001|SN1' },
      },
    ]);
  });

  it('ignores elements without an id or without resourceItems', () => {
    const elements = [
      element({ id: undefined, resourceItems: [{ articleNumber: 'ZM-9999', name: 'Gone', quantity: 1 }] }),
      element({ id: 'el-2', resourceItems: undefined }),
    ];
    expect(findOrphanedAssignments(elements, [])).toEqual([]);
  });
});
