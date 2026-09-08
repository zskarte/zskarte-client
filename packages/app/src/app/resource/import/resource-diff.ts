import { ResourceArticle, ResourceAssignment } from '@zskarte/types';

export interface ResourceImportPreview {
  added: ResourceArticle[];
  removed: ResourceArticle[];
  changed: { articleNumber: string; name: string; oldTotal: number; newTotal: number; oldInStock: number; newInStock: number }[];
  unchanged: number;
  affectedAssignments: { assignment: ResourceAssignment; reason: 'articleRemoved' | 'serialRemoved' | 'overbooked' }[];
  totals: { articles: number; items: number; inStock: number };
}

/**
 * Compares the currently stored catalogue against a freshly parsed one and reports what
 * would change, plus which existing map assignments would be affected by applying it.
 */
export function computeResourceImportPreview(
  current: ResourceArticle[],
  next: ResourceArticle[],
  assignments: ResourceAssignment[],
): ResourceImportPreview {
  const currentByNumber = new Map(current.map((article) => [article.articleNumber, article]));
  const nextByNumber = new Map(next.map((article) => [article.articleNumber, article]));

  const added: ResourceArticle[] = [];
  const changed: ResourceImportPreview['changed'] = [];
  let unchanged = 0;

  for (const article of next) {
    const previous = currentByNumber.get(article.articleNumber);
    if (!previous) {
      added.push(article);
    } else if (previous.totalCount !== article.totalCount || previous.inStockCount !== article.inStockCount) {
      changed.push({
        articleNumber: article.articleNumber,
        name: article.name,
        oldTotal: previous.totalCount,
        newTotal: article.totalCount,
        oldInStock: previous.inStockCount,
        newInStock: article.inStockCount,
      });
    } else {
      unchanged++;
    }
  }

  const removed: ResourceArticle[] = current.filter((article) => !nextByNumber.has(article.articleNumber));

  const nextItemKeysByArticle = new Map<string, Set<string>>();
  for (const article of next) {
    const keys = new Set<string>();
    for (const item of article.items) {
      if (item.itemKey) keys.add(item.itemKey);
    }
    nextItemKeysByArticle.set(article.articleNumber, keys);
  }

  const assignedQtyByArticle = new Map<string, number>();
  for (const assignment of assignments) {
    assignedQtyByArticle.set(assignment.articleNumber, (assignedQtyByArticle.get(assignment.articleNumber) ?? 0) + assignment.quantity);
  }

  const affectedAssignments: ResourceImportPreview['affectedAssignments'] = [];
  for (const assignment of assignments) {
    const nextArticle = nextByNumber.get(assignment.articleNumber);
    if (!nextArticle) {
      affectedAssignments.push({ assignment, reason: 'articleRemoved' });
      continue;
    }
    if (assignment.itemKey && !nextItemKeysByArticle.get(assignment.articleNumber)?.has(assignment.itemKey)) {
      affectedAssignments.push({ assignment, reason: 'serialRemoved' });
      continue;
    }
    const totalAssigned = assignedQtyByArticle.get(assignment.articleNumber) ?? 0;
    if (totalAssigned > nextArticle.inStockCount) {
      affectedAssignments.push({ assignment, reason: 'overbooked' });
    }
  }

  const totals = {
    articles: next.length,
    items: next.reduce((sum, article) => sum + article.totalCount, 0),
    inStock: next.reduce((sum, article) => sum + article.inStockCount, 0),
  };

  return { added, removed, changed, unchanged, affectedAssignments, totals };
}
