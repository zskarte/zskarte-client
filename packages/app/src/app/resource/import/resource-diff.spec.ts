// Pure module, no Angular TestBed involved — import the globals explicitly (vitest `globals` is not enabled repo-wide).
import { describe, expect, it } from 'vitest';
import { ResourceArticle, ResourceAssignment } from '@zskarte/types';

import { computeResourceImportPreview } from './resource-diff';

function article(overrides: Partial<ResourceArticle> = {}): ResourceArticle {
  return {
    articleNumber: 'ZM-1',
    name: 'Test Article',
    articleGroup: 'Group',
    articleType: 'Type',
    serialized: false,
    totalCount: 1,
    inStockCount: 1,
    items: [{ status: 'an Lager' }],
    ...overrides,
  };
}

function assignment(overrides: Partial<ResourceAssignment> = {}): ResourceAssignment {
  return {
    articleNumber: 'ZM-1',
    name: 'Test Article',
    quantity: 1,
    ...overrides,
  };
}

describe('computeResourceImportPreview', () => {
  it('treats everything as added when current is empty (first import), with no affected assignments', () => {
    const next = [article({ articleNumber: 'ZM-1' }), article({ articleNumber: 'ZM-2' })];
    const preview = computeResourceImportPreview([], next, []);

    expect(preview.added).toEqual(next);
    expect(preview.removed).toEqual([]);
    expect(preview.changed).toEqual([]);
    expect(preview.unchanged).toBe(0);
    expect(preview.affectedAssignments).toEqual([]);
    expect(preview.totals).toEqual({ articles: 2, items: 2, inStock: 2 });
  });

  it('detects added, removed, changed and unchanged articles', () => {
    const current = [
      article({ articleNumber: 'ZM-1', totalCount: 2, inStockCount: 2 }),
      article({ articleNumber: 'ZM-2', totalCount: 1, inStockCount: 1 }),
      article({ articleNumber: 'ZM-3', totalCount: 1, inStockCount: 1 }),
    ];
    const next = [
      article({ articleNumber: 'ZM-1', totalCount: 3, inStockCount: 1 }), // changed
      article({ articleNumber: 'ZM-3', totalCount: 1, inStockCount: 1 }), // unchanged
      article({ articleNumber: 'ZM-4' }), // added
    ];

    const preview = computeResourceImportPreview(current, next, []);

    expect(preview.added.map((a) => a.articleNumber)).toEqual(['ZM-4']);
    expect(preview.removed.map((a) => a.articleNumber)).toEqual(['ZM-2']);
    expect(preview.changed).toEqual([
      { articleNumber: 'ZM-1', name: 'Test Article', oldTotal: 2, newTotal: 3, oldInStock: 2, newInStock: 1 },
    ]);
    expect(preview.unchanged).toBe(1);
  });

  it('flags an assignment as articleRemoved when its article is gone from the next catalogue', () => {
    const current = [article({ articleNumber: 'ZM-1' })];
    const next: ResourceArticle[] = [];
    const assignments = [assignment({ articleNumber: 'ZM-1' })];

    const preview = computeResourceImportPreview(current, next, assignments);

    expect(preview.affectedAssignments).toEqual([{ assignment: assignments[0], reason: 'articleRemoved' }]);
  });

  it('flags an assignment as serialRemoved when the article survives but its itemKey is gone', () => {
    const current = [
      article({
        articleNumber: 'ZM-1',
        serialized: true,
        items: [{ status: 'an Lager', serialNumber: 'SN-1', itemKey: 'ZM-1|SN-1' }],
      }),
    ];
    const next = [
      article({
        articleNumber: 'ZM-1',
        serialized: true,
        items: [{ status: 'an Lager', serialNumber: 'SN-2', itemKey: 'ZM-1|SN-2' }],
      }),
    ];
    const assignments = [assignment({ articleNumber: 'ZM-1', serialNumber: 'SN-1', itemKey: 'ZM-1|SN-1' })];

    const preview = computeResourceImportPreview(current, next, assignments);

    expect(preview.affectedAssignments).toEqual([{ assignment: assignments[0], reason: 'serialRemoved' }]);
  });

  it('flags an assignment as overbooked when total assigned quantity exceeds the new inStockCount', () => {
    const current = [article({ articleNumber: 'ZM-1', totalCount: 5, inStockCount: 5 })];
    const next = [article({ articleNumber: 'ZM-1', totalCount: 5, inStockCount: 1 })];
    const assignments = [
      assignment({ articleNumber: 'ZM-1', quantity: 2 }),
      assignment({ articleNumber: 'ZM-1', quantity: 1 }),
    ];

    const preview = computeResourceImportPreview(current, next, assignments);

    expect(preview.affectedAssignments).toEqual([
      { assignment: assignments[0], reason: 'overbooked' },
      { assignment: assignments[1], reason: 'overbooked' },
    ]);
  });

  it('does not flag an assignment that is still valid within stock', () => {
    const current = [article({ articleNumber: 'ZM-1', totalCount: 5, inStockCount: 5 })];
    const next = [article({ articleNumber: 'ZM-1', totalCount: 5, inStockCount: 5 })];
    const assignments = [assignment({ articleNumber: 'ZM-1', quantity: 2 })];

    const preview = computeResourceImportPreview(current, next, assignments);

    expect(preview.affectedAssignments).toEqual([]);
  });

  it('yields at most one entry per assignment, preferring articleRemoved over the other reasons', () => {
    const current = [article({ articleNumber: 'ZM-1', totalCount: 5, inStockCount: 5 })];
    const next: ResourceArticle[] = [];
    // would also be "overbooked"-shaped if the article existed, but it does not: only articleRemoved should fire.
    const assignments = [assignment({ articleNumber: 'ZM-1', quantity: 10 })];

    const preview = computeResourceImportPreview(current, next, assignments);

    expect(preview.affectedAssignments.length).toBe(1);
    expect(preview.affectedAssignments[0].reason).toBe('articleRemoved');
  });
});
