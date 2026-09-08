import { describe, expect, it } from 'vitest';
import { Signs } from '../map-renderer/signs';
import {
  RESOURCE_COLLECTION_SIGN_ID,
  RESOURCE_SIGN_BY_ARTICLE_GROUP,
  RESOURCE_SIGN_BY_NAME_FRAGMENT,
  resolveCollectionSignId,
  resolveResourceSignId,
} from './resource-signature.mapping';

describe('resolveResourceSignId', () => {
  it('resolves by a fragment of the article name, whatever the article number is', () => {
    const { fragment, signId } = RESOURCE_SIGN_BY_NAME_FRAGMENT[0];
    expect(resolveResourceSignId({ name: `Ein ${fragment}-Set`, articleGroup: 'irrelevant-group' })).toBe(signId);
  });

  it('matches the name fragment case-insensitively', () => {
    const { fragment, signId } = RESOURCE_SIGN_BY_NAME_FRAGMENT[0];
    expect(resolveResourceSignId({ name: fragment.toUpperCase(), articleGroup: 'Unknown Group' })).toBe(signId);
  });

  it('prefers the name mapping over the articleGroup mapping', () => {
    const { fragment, signId } = RESOURCE_SIGN_BY_NAME_FRAGMENT[0];
    expect(resolveResourceSignId({ name: `${fragment}-Set`, articleGroup: 'Transport/Logistik' })).toBe(signId);
  });

  it('falls back to the articleGroup mapping when the name matches nothing', () => {
    const id = resolveResourceSignId({ name: 'Anhänger ZS', articleGroup: 'Transport/Logistik' });
    expect(id).toBe(RESOURCE_SIGN_BY_ARTICLE_GROUP['Transport/Logistik']);
  });

  it('falls back to the placeholder when neither the name nor the articleGroup match', () => {
    const id = resolveResourceSignId({ name: 'Stromaggregat', articleGroup: 'Unknown Group' });
    expect(id).toBe(Signs.RESOURCE_PLACEHOLDER_SIGN_ID);
  });

  it('does not claim a sign for articles that merely belong to an NTP set', () => {
    for (const name of ['Blitzwarnlampe NTP', 'Faltsignal NTP', 'Polycom TPH 900 NTP Einerset']) {
      expect(resolveResourceSignId({ name, articleGroup: 'Spezialartikel' })).toBe(Signs.RESOURCE_PLACEHOLDER_SIGN_ID);
    }
  });

  it('every id in RESOURCE_SIGN_BY_NAME_FRAGMENT exists in Signs.SIGNS', () => {
    for (const { signId } of RESOURCE_SIGN_BY_NAME_FRAGMENT) {
      expect(Signs.getSignById(signId)).toBeDefined();
    }
  });

  it('every fragment in RESOURCE_SIGN_BY_NAME_FRAGMENT is lowercase, as the matching expects', () => {
    for (const { fragment } of RESOURCE_SIGN_BY_NAME_FRAGMENT) {
      expect(fragment).toBe(fragment.toLowerCase());
    }
  });

  it('every id in RESOURCE_SIGN_BY_ARTICLE_GROUP exists in Signs.SIGNS', () => {
    for (const id of Object.values(RESOURCE_SIGN_BY_ARTICLE_GROUP)) {
      expect(Signs.getSignById(id)).toBeDefined();
    }
  });

  it('RESOURCE_COLLECTION_SIGN_ID exists in Signs.SIGNS', () => {
    expect(Signs.getSignById(RESOURCE_COLLECTION_SIGN_ID)).toBeDefined();
  });

  it('Signs.RESOURCE_PLACEHOLDER_SIGN_ID exists in Signs.SIGNS', () => {
    expect(Signs.getSignById(Signs.RESOURCE_PLACEHOLDER_SIGN_ID)).toBeDefined();
  });
});

describe('resolveCollectionSignId', () => {
  it('uses the single sign id when every article unanimously resolves to it', () => {
    const articles = [
      { name: 'Anhänger ZS', articleGroup: 'Transport/Logistik' },
      { name: 'Transportfahrzeug', articleGroup: 'Transport/Logistik' },
    ];
    expect(resolveCollectionSignId(articles)).toBe(Signs.TRANSPORT_VEHICLE_SIGN_ID);
  });

  it('falls back to the Materialdepot collection sign for a mixed set of articles', () => {
    const articles = [
      { name: 'Anhänger ZS', articleGroup: 'Transport/Logistik' },
      { name: 'Sanitätsrucksack', articleGroup: 'Sanitätsmaterial' },
    ];
    expect(resolveCollectionSignId(articles)).toBe(RESOURCE_COLLECTION_SIGN_ID);
  });

  it('falls back to the Materialdepot collection sign when every article resolves to the placeholder', () => {
    const articles = [
      { name: 'Stromaggregat', articleGroup: 'Unknown' },
      { name: 'Leuchtballon', articleGroup: 'Unknown' },
    ];
    expect(resolveCollectionSignId(articles)).toBe(RESOURCE_COLLECTION_SIGN_ID);
  });

  it('returns the Materialdepot collection sign for an empty article list', () => {
    expect(resolveCollectionSignId([])).toBe(RESOURCE_COLLECTION_SIGN_ID);
  });
});
