import { DocumentApi } from '../map-layer/interfaces';

/** Status as exported by the inventory system; 'an Lager' is the only ready-for-use value. */
export const RESOURCE_STATUS_IN_STOCK = 'an Lager';

/** One physical piece = one CSV row. Empty CSV cells are omitted, never stored as ''. */
export interface ResourceItem {
  status: string;
  serialNumber?: string;
  /** `${articleNumber}|${serialNumber}` (+ '#2', '#3' … for duplicates); only when serialNumber is set. */
  itemKey?: string;
  serialNumberInternal?: string;
  batch?: string;
  storageCode?: string;
  storageLocation?: string;
  storageLocation2?: string;
  comment?: string;
  sealed?: boolean;
  /** ISO yyyy-mm-dd, parsed from the CSV's dd.mm.yyyy. */
  purchaseDate?: string;
  /** WGS84 [lat, lon]. */
  coordinates?: [number, number];
}

/** One article = one Artikelnummer, grouped over all its pieces. */
export interface ResourceArticle {
  articleNumber: string;
  /** true when the CSV row had no Artikelnummer and a '~slug' key was synthesised. */
  syntheticNumber?: boolean;
  name: string;
  nameVariants?: string[];
  articleGroup: string;
  articleType: string;
  manufacturer?: string;
  unit?: string;
  sirenType?: string;
  /** true when at least one piece has a serialNumber. */
  serialized: boolean;
  totalCount: number;
  inStockCount: number;
  items: ResourceItem[];
}

export interface ResourceImportMeta {
  /** Client-generated uuid, used as the idempotency key. */
  importId: string;
  importedAt?: Date;
  sourceExportedAt?: Date;
  sourceOrganisation?: string;
}

export interface ResourceArticleApi extends ResourceArticle, ResourceImportMeta, Partial<DocumentApi> {
  operation?: DocumentApi;
  organization?: DocumentApi;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Body of POST /api/resource-articles/import, wrapped as { data: ResourceImportRequestApi }. */
export interface ResourceImportRequestApi extends ResourceImportMeta {
  operation: string;
  organization: string;
  /** An empty array clears the catalogue. */
  articles: ResourceArticle[];
}

export interface ResourceImportResponseApi {
  importId: string;
  articleCount: number;
  itemCount: number;
  /** true when this importId had already been applied (idempotent replay). */
  alreadyImported: boolean;
}

/** Reference from a map draw element to deployed resources. */
export interface ResourceAssignment {
  articleNumber: string;
  /** Snapshot of the article name so the map stays readable without the catalogue. */
  name: string;
  /** Always 1 for a serialised piece. */
  quantity: number;
  serialNumber?: string;
  itemKey?: string;
}

export type ResourceAvailability = 'available' | 'assigned' | 'unavailable';
