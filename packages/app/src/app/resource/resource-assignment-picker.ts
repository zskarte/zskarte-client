import { RESOURCE_STATUS_IN_STOCK, ResourceArticle, ResourceAssignment, ResourceItem } from '@zskarte/types';
import { ResourceAssignmentIndex } from './resource-assignments';

/**
 * Why a piece is or isn't ready to be assigned:
 * - `free`: in stock (`an Lager`) and on no marker - the normal case.
 * - `notInStock`: the inventory export says something else (in Reparatur, ausgeliehen, ...).
 *   Still offered: the export is a snapshot, and the person on the map knows better than it
 *   does what is actually on site.
 * - `deployed`: already carried by a marker. Offered so the search can explain where a piece
 *   went instead of silently finding nothing, but not selectable - one physical piece cannot
 *   be in two places, and a duplicate `itemKey` corrupts the availability accounting.
 */
export type ResourceAddOptionState = 'free' | 'notInStock' | 'deployed';

/**
 * One pickable unit offered by the "add resource" search on a marker.
 *
 * A serialised option refers to one specific physical piece (`itemKey`/`serialNumber`, always
 * quantity 1); a fungible option stands for `count` interchangeable pieces that share a state.
 * Mirrors the split `ResourcePlacementService.buildAssignments` makes when deploying from the
 * catalogue, so both paths produce the same shape of assignments.
 */
export interface ResourceAddOption {
  article: ResourceArticle;
  articleNumber: string;
  name: string;
  /** Set for a serialised piece only. */
  itemKey?: string;
  serialNumber?: string;
  state: ResourceAddOptionState;
  /** How many pieces this option stands for: always 1 for a serialised piece. */
  count: number;
  /** The raw inventory status when it is not `an Lager` (e.g. "in Reparatur"). */
  status?: string;
}

const STATE_ORDER: Record<ResourceAddOptionState, number> = { free: 0, notInStock: 1, deployed: 2 };

/** Same fields the catalogue's free-text filter searches, restricted to this one option. */
function matchesTerm(option: ResourceAddOption, term: string): boolean {
  if (!term) {
    return true;
  }
  return [option.articleNumber, option.name, option.article.manufacturer, option.serialNumber, option.status]
    .filter((value): value is string => !!value)
    .some((value) => value.toLowerCase().includes(term));
}

/** The inventory status, but only when it says something other than "ready for use". */
function statusHint(status: string | undefined): string | undefined {
  return status && status !== RESOURCE_STATUS_IN_STOCK ? status : undefined;
}

function stateOf(item: ResourceItem, index: ResourceAssignmentIndex): ResourceAddOptionState {
  if (item.itemKey && index.byItemKey.has(item.itemKey)) {
    return 'deployed';
  }
  return item.status === RESOURCE_STATUS_IN_STOCK ? 'free' : 'notInStock';
}

/**
 * Turns the pieces of one article into pickable options: every serialised piece on its own,
 * the pieces without a serial number pooled per state.
 *
 * The pool is what makes the numbers add up for fungible articles: the individual pieces are
 * indistinguishable, so what is assigned is a *quantity* (`index.byArticle`), not specific
 * items. That quantity is charged against the pooled in-stock pieces first, exactly like
 * `computeResourceCatalogueRows` computes the catalogue's "Frei" column.
 */
function optionsForArticle(article: ResourceArticle, index: ResourceAssignmentIndex): ResourceAddOption[] {
  const base = { article, articleNumber: article.articleNumber, name: article.name };
  const options: ResourceAddOption[] = [];
  const pooled = new Map<string, { state: ResourceAddOptionState; status?: string; count: number }>();

  for (const item of article.items) {
    const state = stateOf(item, index);
    if (item.itemKey) {
      options.push({
        ...base,
        itemKey: item.itemKey,
        serialNumber: item.serialNumber,
        state,
        count: 1,
        status: statusHint(item.status),
      });
      continue;
    }
    const key = `${state}|${item.status}`;
    const entry = pooled.get(key) ?? { state, status: item.status, count: 0 };
    entry.count++;
    pooled.set(key, entry);
  }

  // Assigned quantity that no serialised piece accounts for: it belongs to the pool.
  const assignedSerialised = article.items.filter((item) => item.itemKey && index.byItemKey.has(item.itemKey)).length;
  let pooledAssigned = Math.max(0, (index.byArticle.get(article.articleNumber)?.quantity ?? 0) - assignedSerialised);

  for (const entry of [...pooled.values()].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state])) {
    const deployed = Math.min(entry.count, pooledAssigned);
    pooledAssigned -= deployed;
    if (deployed > 0) {
      options.push({ ...base, state: 'deployed', count: deployed, status: statusHint(entry.status) });
    }
    if (entry.count > deployed) {
      options.push({
        ...base,
        state: entry.state,
        count: entry.count - deployed,
        status: statusHint(entry.status),
      });
    }
  }

  return options;
}

/**
 * Builds the resources offered by a marker's "add resource" search, best first: what is free,
 * then what the inventory lists elsewhere (repair, on loan), then what is already on the map.
 *
 * Everything in the catalogue is reachable here - a piece is never hidden just because the
 * export calls it unavailable; its state is spelled out on the option instead, and only
 * `deployed` pieces cannot be picked. Assignments come from `ResourceService.assignmentIndex`,
 * which is derived from the live map state, so a piece's state follows the map immediately -
 * including changes made by another user in the same operation.
 */
export function buildResourceAddOptions(
  articles: ResourceArticle[],
  index: ResourceAssignmentIndex,
  searchTerm: string,
  limit = 25,
): ResourceAddOption[] {
  const term = searchTerm.trim().toLowerCase();

  return articles
    .flatMap((article) => optionsForArticle(article, index))
    .filter((option) => matchesTerm(option, term))
    .sort(
      (a, b) =>
        STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
        a.name.localeCompare(b.name) ||
        a.articleNumber.localeCompare(b.articleNumber) ||
        // within one article: the serialised pieces first, the pooled remainder last
        Number(!a.serialNumber) - Number(!b.serialNumber) ||
        (a.serialNumber ?? '').localeCompare(b.serialNumber ?? ''),
    )
    .slice(0, limit);
}

/** A piece already on the map cannot be assigned again - one physical piece, one place. */
export function canAssignOption(option: ResourceAddOption): boolean {
  return option.state !== 'deployed';
}

/**
 * Returns `items` with `option` added - never mutating the array it is given, since it is part
 * of the (immer-managed) draw element state.
 *
 * Adding a fungible piece bumps the quantity of the article's existing fungible record instead
 * of appending a second one, so a marker never shows "1× Warnweste" twice. A serialised piece
 * already on this marker is returned unchanged (it is one physical item).
 */
export function appendResourceAssignment(
  items: readonly ResourceAssignment[],
  option: ResourceAddOption,
): ResourceAssignment[] {
  if (option.itemKey) {
    if (items.some((item) => item.itemKey === option.itemKey)) {
      return [...items];
    }
    return [
      ...items,
      {
        articleNumber: option.articleNumber,
        name: option.name,
        quantity: 1,
        serialNumber: option.serialNumber,
        itemKey: option.itemKey,
      },
    ];
  }

  const index = items.findIndex((item) => !item.itemKey && item.articleNumber === option.articleNumber);
  if (index === -1) {
    return [...items, { articleNumber: option.articleNumber, name: option.name, quantity: 1 }];
  }
  return items.map((item, i) => (i === index ? { ...item, quantity: item.quantity + 1 } : item));
}
