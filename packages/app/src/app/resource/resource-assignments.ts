import { IZsMapBaseDrawElementState, ResourceArticle, ResourceAssignment, ResourceAvailability } from '@zskarte/types';

/**
 * Index of resource assignments across all draw elements of a map.
 * Pure, framework-free aggregation used by the resource catalogue and by
 * orphan detection - no Angular DI, no side effects.
 */
export interface ResourceAssignmentIndex {
  /** articleNumber -> summed quantity assigned + the (distinct) elements assigning it. */
  byArticle: Map<string, { quantity: number; elementIds: string[] }>;
  /** itemKey -> elementId (first wins on duplicates - a data anomaly, not an error). */
  byItemKey: Map<string, string>;
}

/**
 * Builds an aggregation index of all resource assignments currently placed on the map.
 *
 * Elements without an `id` or without `resourceItems` are ignored. Quantities are summed
 * per `articleNumber`; each non-empty `itemKey` is mapped to the id of the element that
 * first claims it - a duplicate itemKey (the same physical, serialised piece assigned to
 * two markers) is a data anomaly, not something this function throws on.
 */
export function buildResourceAssignmentIndex(elements: IZsMapBaseDrawElementState[]): ResourceAssignmentIndex {
  const byArticle = new Map<string, { quantity: number; elementIds: string[] }>();
  const byItemKey = new Map<string, string>();

  for (const element of elements) {
    if (!element.id || !element.resourceItems?.length) continue;
    const elementId = element.id;

    for (const assignment of element.resourceItems) {
      let entry = byArticle.get(assignment.articleNumber);
      if (!entry) {
        entry = { quantity: 0, elementIds: [] };
        byArticle.set(assignment.articleNumber, entry);
      }
      entry.quantity += assignment.quantity;
      if (!entry.elementIds.includes(elementId)) {
        entry.elementIds.push(elementId);
      }

      if (assignment.itemKey && !byItemKey.has(assignment.itemKey)) {
        byItemKey.set(assignment.itemKey, elementId);
      }
    }
  }

  return { byArticle, byItemKey };
}

/** One row of the resource catalogue view: an article plus its current deployment state. */
export interface ResourceCatalogueRow {
  article: ResourceArticle;
  assignedCount: number;
  availableCount: number;
  unavailableCount: number;
  /** Which filter buckets this row matches; a row can match several. */
  availability: ResourceAvailability[];
  elementIds: string[];
}

/**
 * Computes one catalogue row per article, in the same order as `articles`.
 *
 * - `assignedCount` is the summed quantity currently placed on the map for that article.
 * - `unavailableCount` is the piece count that is not `an Lager` (damaged, loaned out, ...).
 * - `availableCount` is what's left in stock after subtracting what's assigned, floored at 0.
 */
export function computeResourceCatalogueRows(
  articles: ResourceArticle[],
  index: ResourceAssignmentIndex,
): ResourceCatalogueRow[] {
  return articles.map((article) => {
    const entry = index.byArticle.get(article.articleNumber);
    const assignedCount = entry?.quantity ?? 0;
    const unavailableCount = article.totalCount - article.inStockCount;
    const availableCount = Math.max(0, article.inStockCount - assignedCount);

    const availability: ResourceAvailability[] = [];
    if (availableCount > 0) availability.push('available');
    if (assignedCount > 0) availability.push('assigned');
    if (unavailableCount > 0) availability.push('unavailable');

    return {
      article,
      assignedCount,
      availableCount,
      unavailableCount,
      availability,
      elementIds: entry?.elementIds ?? [],
    };
  });
}

/** One resource assignment on the map that no longer refers to something in the catalogue. */
export interface OrphanedResourceAssignment {
  elementId: string;
  assignment: ResourceAssignment;
}

/**
 * Finds resource assignments on the map whose article - or, for serialised pieces, whose
 * specific item - is no longer part of the given catalogue (e.g. after a re-import that
 * dropped or replaced articles).
 */
export function findOrphanedAssignments(
  elements: IZsMapBaseDrawElementState[],
  articles: ResourceArticle[],
): OrphanedResourceAssignment[] {
  const articleByNumber = new Map(articles.map((article) => [article.articleNumber, article]));
  const orphaned: OrphanedResourceAssignment[] = [];

  for (const element of elements) {
    if (!element.id || !element.resourceItems?.length) continue;

    for (const assignment of element.resourceItems) {
      const article = articleByNumber.get(assignment.articleNumber);
      if (!article) {
        orphaned.push({ elementId: element.id, assignment });
        continue;
      }
      if (assignment.itemKey && !article.items.some((item) => item.itemKey === assignment.itemKey)) {
        orphaned.push({ elementId: element.id, assignment });
      }
    }
  }

  return orphaned;
}
