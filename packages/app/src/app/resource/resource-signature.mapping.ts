import { ResourceArticle } from '@zskarte/types';
import { Signs } from '../map-renderer/signs';

/**
 * Name fragments that identify what an article *is*, matched case-insensitively against the
 * `Artikel` column of the imported CSV.
 *
 * Deliberately sparse, and deliberately keyed on the article name rather than on article
 * numbers: numbers are assigned per organisation, so a hardcoded list of them only ever fits
 * the one export it was read from. The names in the export are the shared vocabulary.
 *
 * Only fragments that name the very thing a BABS sign depicts belong here. 'Notfalltreffpunkt'
 * is such a case (sign 158). The bare abbreviation 'NTP' is not: it also appears on articles
 * that merely belong to an NTP set - a warning lamp, a radio set, a folding sign - none of
 * which *are* the meeting point. Those fall through to the group mapping and then to the
 * placeholder, which is the honest answer.
 *
 * The BABS catalogue has no pictograms for generators, lighting, pumps, sirens or
 * extinguishers either, and the near-matches that exist ('Energieausfall', 'Stromausfall',
 * 'Wasserversorgungsausfall') are red/orange damage-or-hazard signs that would be factually
 * wrong on a resource marker - so those keep the neutral placeholder too.
 */
export const RESOURCE_SIGN_BY_NAME_FRAGMENT: { fragment: string; signId: number }[] = [
  { fragment: 'notfalltreffpunkt', signId: 158 }, // Notfalltreffpunkt
];

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
 * Resolves the pictogram id for a single resource article: by a fragment of its name, then by
 * `articleGroup`, and finally the resource placeholder when nothing matches.
 */
export function resolveResourceSignId(article: Pick<ResourceArticle, 'name' | 'articleGroup'>): number {
  const name = article.name?.toLowerCase() ?? '';
  const byName = RESOURCE_SIGN_BY_NAME_FRAGMENT.find((entry) => name.includes(entry.fragment));
  return byName?.signId ?? RESOURCE_SIGN_BY_ARTICLE_GROUP[article.articleGroup] ?? Signs.RESOURCE_PLACEHOLDER_SIGN_ID;
}

/**
 * Resolves the pictogram id for a marker that collects several resource articles: if every
 * article resolves to the same specific (non-placeholder) sign, that sign is used; otherwise
 * the generic Materialdepot collection sign is used.
 */
export function resolveCollectionSignId(articles: Pick<ResourceArticle, 'name' | 'articleGroup'>[]): number {
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
