import { ResourceArticle } from '@zskarte/types';
import { Signs } from '../map-renderer/signs';

/**
 * Maps a specific `articleNumber` to a BABS pictogram id.
 *
 * Deliberately sparse: the BABS catalogue has no pictograms for generators, lighting,
 * pumps, sirens or extinguishers, and the near-matches that exist ('Energieausfall',
 * 'Stromausfall', 'Wasserversorgungsausfall') are red/orange damage-or-hazard signs that
 * would be factually wrong for a resource marker. Only articles that genuinely are the
 * thing a real sign depicts are listed here - everything else falls through to the group
 * mapping, and then to the placeholder.
 *
 * The two entries below are the NTP-specific articles found in the sample export
 * ("Grid-Export (63)(Tabelle1).csv"), both under the 'Spezialartikel' article group and
 * both literally naming themselves as the NTP set/signal:
 * - ZM-001665 'Notfalltreffpunkt-Set NTP'
 * - ZM-001834 'Faltsignal NTP'
 * They map to sign id 158 ('Notfalltreffpunkt' / 'Emergency meeting point').
 * (Two further NTP-adjacent articles exist in the export - ZM-001835 'Blitzwarnlampe NTP'
 * and ZM-001693 'Polycom TPH 900 NTP Einerset' - but neither one *is* the NTP marker
 * itself (a warning lamp and a radio set respectively), so they are intentionally left
 * unmapped and fall back to the placeholder.)
 */
export const RESOURCE_SIGN_BY_ARTICLE_NUMBER: Record<string, number> = {
  'ZM-001665': 158, // Notfalltreffpunkt-Set NTP -> Notfalltreffpunkt
  'ZM-001834': 158, // Faltsignal NTP -> Notfalltreffpunkt
};

/**
 * Maps an `articleGroup` to a BABS pictogram id. Used when no per-article mapping exists.
 */
export const RESOURCE_SIGN_BY_ARTICLE_GROUP: Record<string, number> = {
  'Transport/Logistik': Signs.TRANSPORT_VEHICLE_SIGN_ID, // 201 - Transportfahrzeug
  'Sanitätsmaterial': 94, // Sanitätshilfsstelle
};

/** Materialdepot - the default pictogram for a marker collecting several distinct resources. */
export const RESOURCE_COLLECTION_SIGN_ID = 80;

/**
 * Resolves the pictogram id for a single resource article: by `articleNumber`, then by
 * `articleGroup`, and finally the resource placeholder when nothing matches.
 */
export function resolveResourceSignId(article: Pick<ResourceArticle, 'articleNumber' | 'articleGroup'>): number {
  return (
    RESOURCE_SIGN_BY_ARTICLE_NUMBER[article.articleNumber] ??
    RESOURCE_SIGN_BY_ARTICLE_GROUP[article.articleGroup] ??
    Signs.RESOURCE_PLACEHOLDER_SIGN_ID
  );
}

/**
 * Resolves the pictogram id for a marker that collects several resource articles: if every
 * article resolves to the same specific (non-placeholder) sign, that sign is used; otherwise
 * the generic Materialdepot collection sign is used.
 */
export function resolveCollectionSignId(articles: Pick<ResourceArticle, 'articleNumber' | 'articleGroup'>[]): number {
  if (articles.length === 0) {
    return RESOURCE_COLLECTION_SIGN_ID;
  }

  const resolvedIds = articles.map((article) => resolveResourceSignId(article));
  const [first, ...rest] = resolvedIds;
  const allSame = rest.every((id) => id === first);

  if (allSame && first !== Signs.RESOURCE_PLACEHOLDER_SIGN_ID) {
    return first;
  }
  return RESOURCE_COLLECTION_SIGN_ID;
}
