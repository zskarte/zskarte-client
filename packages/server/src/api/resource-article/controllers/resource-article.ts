/**
 * resource-article controller
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import fp from 'lodash/fp';
import { broadcastResourcesUpdate } from '../../../state/resources';

const MAX_ARTICLES = 5000;
const MAX_ITEMS_PER_ARTICLE = 5000;
const MAX_TOTAL_ITEMS = 60000;
const MAX_ARTICLE_NUMBER_LENGTH = 64;
const MAX_NAME_LENGTH = 255;
const MAX_STRING_LENGTH = 255;
const MAX_ITEM_STRING_LENGTH = 512;
const MAX_NAME_VARIANTS = 20;
/** Optional string fields of ResourceItem; `status` is handled separately because it is required. */
const ITEM_STRING_FIELDS = [
  'serialNumber',
  'itemKey',
  'serialNumberInternal',
  'batch',
  'storageCode',
  'storageLocation',
  'storageLocation2',
  'comment',
  'purchaseDate',
] as const;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESOURCE_ARTICLE_POPULATE = {
  operation: { fields: ['documentId' as any] },
  organization: { fields: ['documentId' as any] },
};

/** Trims a string and caps its length, returns undefined for non-strings/empty results. */
const optionalString = (value: unknown, maxLength: number = MAX_STRING_LENGTH): string | undefined => {
  if (!fp.isString(value)) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
};

/** Trims a required string, throws a ValidationError if it is missing/empty. */
const requiredString = (value: unknown, maxLength: number, fieldLabel: string): string => {
  const trimmed = optionalString(value, maxLength);
  if (!trimmed) {
    throw new errors.ValidationError(`"${fieldLabel}" is required and must be a non-empty string`);
  }
  return trimmed;
};

/** Validates a required finite number (used for totalCount/inStockCount). */
const requiredNumber = (value: unknown, fieldLabel: string): number => {
  if (!fp.isFinite(value)) {
    throw new errors.ValidationError(`"${fieldLabel}" is required and must be a number`);
  }
  return value as number;
};

const optionalBoolean = (value: unknown, defaultValue: boolean): boolean => {
  return fp.isBoolean(value) ? value : defaultValue;
};

const optionalDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

/** WGS84 [lat, lon] or undefined. */
const optionalCoordinates = (value: unknown): [number, number] | undefined => {
  if (!fp.isArray(value) || value.length !== 2) return undefined;
  const [lat, lon] = value;
  if (!fp.isFinite(lat) || !fp.isFinite(lon)) return undefined;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined;
  return [lat as number, lon as number];
};

/**
 * Rebuilds a single piece from the schema allow-list.
 * The client payload must never reach the json column unfiltered - it is stored verbatim
 * and handed back to every client of the operation.
 */
const sanitizeItem = (value: unknown, itemLabel: string): Record<string, unknown> => {
  if (!fp.isObject(value)) {
    throw new errors.ValidationError(`"${itemLabel}" must be an object`);
  }
  const item = value as any;
  const sanitized: Record<string, unknown> = {
    status: optionalString(item.status, MAX_ITEM_STRING_LENGTH) ?? '',
  };
  for (const field of ITEM_STRING_FIELDS) {
    const parsed = optionalString(item[field], MAX_ITEM_STRING_LENGTH);
    if (parsed !== undefined) sanitized[field] = parsed;
  }
  if (fp.isBoolean(item.sealed)) sanitized.sealed = item.sealed;
  const coordinates = optionalCoordinates(item.coordinates);
  if (coordinates) sanitized.coordinates = coordinates;
  return sanitized;
};

/** Distinct, trimmed, capped list of alternative article spellings. */
const sanitizeNameVariants = (value: unknown): string[] | undefined => {
  if (!fp.isArray(value)) return undefined;
  const variants = [
    ...new Set(
      value
        .slice(0, MAX_NAME_VARIANTS)
        .map((entry) => optionalString(entry, MAX_NAME_LENGTH))
        .filter((entry): entry is string => entry !== undefined),
    ),
  ];
  return variants.length > 0 ? variants : undefined;
};

export default factories.createCoreController('api::resource-article.resource-article', ({ strapi }) => ({
  async find(ctx) {
    ctx.query.populate = RESOURCE_ARTICLE_POPULATE;
    return await super.find(ctx);
  },
  async findOne(ctx) {
    ctx.query.populate = RESOURCE_ARTICLE_POPULATE;
    return await super.findOne(ctx);
  },
  async import(ctx) {
    const { identifier }: { identifier: string } = ctx.request.headers as any;
    if (!identifier) {
      ctx.status = 400;
      return { message: 'Missing headers: identifier' };
    }

    await this.validateQuery(ctx);
    await this.sanitizeQuery(ctx);

    const { data: rawData } = ctx.request.body as any;
    if (!fp.isObject(rawData)) {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }
    const data = rawData as any;

    //validate & normalise defensively - never spread the client object into the DB row
    const operationDocumentId = requiredString(data.operation, MAX_STRING_LENGTH, 'data.operation');
    const organizationDocumentId = requiredString(data.organization, MAX_STRING_LENGTH, 'data.organization');
    const importId = requiredString(data.importId, MAX_STRING_LENGTH, 'data.importId');
    if (!UUID_REGEX.test(importId)) {
      throw new errors.ValidationError('"data.importId" must be a valid uuid');
    }
    const sourceExportedAt = optionalDate(data.sourceExportedAt);
    const sourceOrganisation = optionalString(data.sourceOrganisation);

    if (!fp.isArray(data.articles)) {
      throw new errors.ValidationError('"data.articles" is required and must be an array');
    }
    if (data.articles.length > MAX_ARTICLES) {
      throw new errors.ValidationError(`"data.articles" must not contain more than ${MAX_ARTICLES} entries`);
    }

    let itemCount = 0;
    const rows = data.articles.map((rawArticle: any, index: number) => {
      if (!fp.isObject(rawArticle)) {
        throw new errors.ValidationError(`"data.articles[${index}]" must be an object`);
      }
      const article = rawArticle as any;
      if (!fp.isArray(article.items)) {
        throw new errors.ValidationError(`"data.articles[${index}].items" is required and must be an array`);
      }
      if (article.items.length > MAX_ITEMS_PER_ARTICLE) {
        throw new errors.ValidationError(
          `"data.articles[${index}].items" must not contain more than ${MAX_ITEMS_PER_ARTICLE} entries`,
        );
      }
      itemCount += article.items.length;
      if (itemCount > MAX_TOTAL_ITEMS) {
        throw new errors.ValidationError(`"data.articles" must not contain more than ${MAX_TOTAL_ITEMS} items in total`);
      }

      //build the DB row explicitly, field by field, from the schema allow-list
      return {
        articleNumber: requiredString(article.articleNumber, MAX_ARTICLE_NUMBER_LENGTH, `data.articles[${index}].articleNumber`),
        syntheticNumber: optionalBoolean(article.syntheticNumber, false),
        name: requiredString(article.name, MAX_NAME_LENGTH, `data.articles[${index}].name`),
        nameVariants: sanitizeNameVariants(article.nameVariants),
        articleGroup: optionalString(article.articleGroup),
        articleType: optionalString(article.articleType),
        manufacturer: optionalString(article.manufacturer),
        unit: optionalString(article.unit),
        sirenType: optionalString(article.sirenType),
        serialized: optionalBoolean(article.serialized, false),
        totalCount: requiredNumber(article.totalCount, `data.articles[${index}].totalCount`),
        inStockCount: requiredNumber(article.inStockCount, `data.articles[${index}].inStockCount`),
        items: article.items.map((item: unknown, itemIndex: number) =>
          sanitizeItem(item, `data.articles[${index}].items[${itemIndex}]`),
        ),
        importId,
        importedAt: new Date(),
        sourceExportedAt,
        sourceOrganisation,
        operation: operationDocumentId,
        organization: organizationDocumentId,
      };
    });
    const articleCount = rows.length;

    //load the operation, it must exist and be active
    const operation = await strapi.documents('api::operation.operation').findOne({
      documentId: operationDocumentId,
      fields: ['phase'],
    });
    if (!operation) {
      return ctx.notFound(`operation ${operationDocumentId} not found`);
    }
    if (operation.phase !== 'active') {
      return ctx.forbidden('The operation is archived, no update allowed.');
    }

    //idempotency: if this import was already applied, don't re-apply it
    const alreadyImportedCount = await strapi.documents('api::resource-article.resource-article').count({
      filters: {
        operation: { documentId: { $eq: operationDocumentId } },
        importId: { $eq: importId },
      },
    });
    if (alreadyImportedCount > 0) {
      return this.transformResponse({ importId, articleCount, itemCount, alreadyImported: true });
    }

    await strapi.db.transaction(async () => {
      //replace the operation's whole resource catalogue with the newly imported one
      await strapi.db
        .query('api::resource-article.resource-article')
        .deleteMany({ filters: { operation: { documentId: operationDocumentId } } });

      for (const row of rows) {
        await strapi.documents('api::resource-article.resource-article').create({ data: row });
      }
    });

    broadcastResourcesUpdate(identifier, operationDocumentId, { importId, articleCount, itemCount });

    ctx.status = 201;
    return this.transformResponse({ importId, articleCount, itemCount, alreadyImported: false });
  },
}));
