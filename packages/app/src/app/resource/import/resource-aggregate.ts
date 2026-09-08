import { RESOURCE_STATUS_IN_STOCK, ResourceArticle, ResourceItem } from '@zskarte/types';
import { ResourceCsvIssue } from './resource-csv.parser';

const internalOrderCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Lowercase, trimmed, whitespace collapsed to '-'. Umlauts are kept as-is — the key only has to be deterministic. */
export function slugifyArticleName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Trims a raw CSV cell; treats blank and the literal '#VALUE!' as absent. */
function cell(value: string | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '#VALUE!') {
    return undefined;
  }
  return trimmed;
}

/** Picks the most frequent value (ties won by first-seen order) and returns the other distinct values seen. */
function mostFrequent(values: string[]): { value?: string; variants: string[] } {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const value of values) {
    if (!counts.has(value)) {
      counts.set(value, 0);
      order.push(value);
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  if (order.length === 0) {
    return { value: undefined, variants: [] };
  }
  let best = order[0];
  let bestCount = counts.get(best) ?? 0;
  for (const value of order) {
    const count = counts.get(value) ?? 0;
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return { value: best, variants: order.filter((value) => value !== best) };
}

function parsePurchaseDate(value: string): string | undefined {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseCoordinates(value: string): [number, number] | undefined {
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 2) {
    return undefined;
  }
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return undefined;
  }
  return [lat, lon];
}

interface ItemEntry {
  item: ResourceItem;
  index: number;
}

interface ArticleBucket {
  articleNumber: string;
  syntheticNumber: boolean;
  names: string[];
  articleGroups: string[];
  articleTypes: string[];
  manufacturers: string[];
  units: string[];
  sirenTypes: string[];
  entries: ItemEntry[];
}

/**
 * Assigns `itemKey` to every entry that has a serialNumber. Because (articleNumber,
 * serialNumber) is not unique in the real data, duplicates within the same serialNumber
 * are ordered deterministically (by serialNumberInternal, then storageCode, then original
 * CSV row order) and get '#2', '#3', … appended.
 */
function assignItemKeys(articleNumber: string, entries: ItemEntry[]): void {
  const groups = new Map<string, ItemEntry[]>();
  for (const entry of entries) {
    const serialNumber = entry.item.serialNumber;
    if (!serialNumber) {
      continue;
    }
    const group = groups.get(serialNumber);
    if (group) {
      group.push(entry);
    } else {
      groups.set(serialNumber, [entry]);
    }
  }

  for (const [serialNumber, group] of groups) {
    const baseKey = `${articleNumber}|${serialNumber}`;
    if (group.length === 1) {
      group[0].item.itemKey = baseKey;
      continue;
    }
    const sorted = [...group].sort((a, b) => {
      const byInternal = internalOrderCollator.compare(a.item.serialNumberInternal ?? '', b.item.serialNumberInternal ?? '');
      if (byInternal !== 0) {
        return byInternal;
      }
      const byStorage = internalOrderCollator.compare(a.item.storageCode ?? '', b.item.storageCode ?? '');
      if (byStorage !== 0) {
        return byStorage;
      }
      return a.index - b.index;
    });
    sorted.forEach((entry, position) => {
      entry.item.itemKey = position === 0 ? baseKey : `${baseKey}#${position + 1}`;
    });
  }
}

export function aggregateResourceArticles(rows: Record<string, string>[]): {
  articles: ResourceArticle[];
  warnings: ResourceCsvIssue[];
} {
  const warnings: ResourceCsvIssue[] = [];
  let emptyNameCount = 0;
  let syntheticNumberCount = 0;
  let badDateCount = 0;
  let badCoordinatesCount = 0;

  const buckets = new Map<string, ArticleBucket>();
  const bucketOrder: string[] = [];

  rows.forEach((row, index) => {
    const name = cell(row['Artikel']);
    if (!name) {
      emptyNameCount++;
      return;
    }

    const articleNumberRaw = cell(row['Artikelnummer']);
    const syntheticNumber = !articleNumberRaw;
    if (syntheticNumber) {
      syntheticNumberCount++;
    }
    const key = articleNumberRaw ?? `~${slugifyArticleName(name)}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        articleNumber: key,
        syntheticNumber,
        names: [],
        articleGroups: [],
        articleTypes: [],
        manufacturers: [],
        units: [],
        sirenTypes: [],
        entries: [],
      };
      buckets.set(key, bucket);
      bucketOrder.push(key);
    }

    bucket.names.push(name);
    const articleGroup = cell(row['Artikelgruppe']);
    if (articleGroup) bucket.articleGroups.push(articleGroup);
    const articleType = cell(row['Artikeltyp']);
    if (articleType) bucket.articleTypes.push(articleType);
    const manufacturer = cell(row['Hersteller']);
    if (manufacturer) bucket.manufacturers.push(manufacturer);
    const unit = cell(row['Einheit']);
    if (unit) bucket.units.push(unit);
    const sirenType = cell(row['Sirenentyp']);
    if (sirenType) bucket.sirenTypes.push(sirenType);

    const item: ResourceItem = { status: cell(row['Status']) ?? '' };

    const serialNumber = cell(row['Seriennummer']);
    if (serialNumber) item.serialNumber = serialNumber;
    const serialNumberInternal = cell(row['Serien-Nr. intern']);
    if (serialNumberInternal) item.serialNumberInternal = serialNumberInternal;
    const batch = cell(row['Charge']);
    if (batch) item.batch = batch;
    const storageCode = cell(row['Lagerort-Code']);
    if (storageCode) item.storageCode = storageCode;
    const storageLocation = cell(row['Lagerort']);
    if (storageLocation) item.storageLocation = storageLocation;
    const storageLocation2 = cell(row['Lagerort 2']);
    if (storageLocation2) item.storageLocation2 = storageLocation2;
    const comment = cell(row['Kommentar']);
    if (comment) item.comment = comment;

    const sealedRaw = cell(row['Plombiert']);
    if (sealedRaw === 'Ja') {
      item.sealed = true;
    } else if (sealedRaw === 'Nein') {
      item.sealed = false;
    }

    const purchaseDateRaw = cell(row['Kaufdatum']);
    if (purchaseDateRaw) {
      const purchaseDate = parsePurchaseDate(purchaseDateRaw);
      if (purchaseDate) {
        item.purchaseDate = purchaseDate;
      } else {
        badDateCount++;
      }
    }

    const coordinatesRaw = cell(row['Koordinaten']);
    if (coordinatesRaw) {
      const coordinates = parseCoordinates(coordinatesRaw);
      if (coordinates) {
        item.coordinates = coordinates;
      } else {
        badCoordinatesCount++;
      }
    }

    bucket.entries.push({ item, index });
  });

  for (const key of bucketOrder) {
    const bucket = buckets.get(key)!;
    assignItemKeys(bucket.articleNumber, bucket.entries);
  }

  const articles: ResourceArticle[] = bucketOrder.map((key) => {
    const bucket = buckets.get(key)!;
    const items = bucket.entries.map((entry) => entry.item);
    const { value: name, variants: nameVariants } = mostFrequent(bucket.names);

    const article: ResourceArticle = {
      articleNumber: bucket.articleNumber,
      name: name ?? '',
      articleGroup: mostFrequent(bucket.articleGroups).value ?? '',
      articleType: mostFrequent(bucket.articleTypes).value ?? '',
      serialized: items.some((item) => !!item.serialNumber),
      totalCount: items.length,
      inStockCount: items.filter((item) => item.status === RESOURCE_STATUS_IN_STOCK).length,
      items,
    };

    if (bucket.syntheticNumber) {
      article.syntheticNumber = true;
    }
    if (nameVariants.length > 0) {
      article.nameVariants = nameVariants;
    }
    const manufacturer = mostFrequent(bucket.manufacturers).value;
    if (manufacturer) article.manufacturer = manufacturer;
    const unit = mostFrequent(bucket.units).value;
    if (unit) article.unit = unit;
    const sirenType = mostFrequent(bucket.sirenTypes).value;
    if (sirenType) article.sirenType = sirenType;

    return article;
  });

  articles.sort((a, b) => a.articleNumber.localeCompare(b.articleNumber));

  if (emptyNameCount > 0) {
    warnings.push({
      code: 'emptyName',
      message: `${emptyNameCount} row(s) were skipped because Artikel was empty.`,
      count: emptyNameCount,
    });
  }
  if (syntheticNumberCount > 0) {
    warnings.push({
      code: 'syntheticNumber',
      message: `${syntheticNumberCount} row(s) had no Artikelnummer; a synthetic article key was generated.`,
      count: syntheticNumberCount,
    });
  }
  if (badDateCount > 0) {
    warnings.push({
      code: 'badDate',
      message: `${badDateCount} row(s) had an unparseable Kaufdatum.`,
      count: badDateCount,
    });
  }
  if (badCoordinatesCount > 0) {
    warnings.push({
      code: 'badCoordinates',
      message: `${badCoordinatesCount} row(s) had unparseable Koordinaten.`,
      count: badCoordinatesCount,
    });
  }

  return { articles, warnings };
}
