import { describe, expect, it } from 'vitest';
import { Signs } from '../map-renderer/signs';
import {
  RESOURCE_COLLECTION_SIGN_ID,
  RESOURCE_SIGN_BY_ARTICLE_GROUP,
  RESOURCE_SIGN_BY_ARTICLE_NUMBER,
  resolveCollectionSignId,
  resolveResourceSignId,
} from './resource-signature.mapping';

describe('resolveResourceSignId', () => {
  it('resolves by articleNumber when a specific mapping exists', () => {
    const [articleNumber, expectedId] = Object.entries(RESOURCE_SIGN_BY_ARTICLE_NUMBER)[0];
    const id = resolveResourceSignId({ articleNumber, articleGroup: 'irrelevant-group' });
    expect(id).toBe(expectedId);
  });

  it('prefers the articleNumber mapping over the articleGroup mapping', () => {
    const [articleNumber] = Object.entries(RESOURCE_SIGN_BY_ARTICLE_NUMBER)[0];
    const id = resolveResourceSignId({ articleNumber, articleGroup: 'Transport/Logistik' });
    expect(id).toBe(RESOURCE_SIGN_BY_ARTICLE_NUMBER[articleNumber]);
  });

  it('falls back to the articleGroup mapping when no articleNumber mapping exists', () => {
    const id = resolveResourceSignId({ articleNumber: 'ZM-UNKNOWN', articleGroup: 'Transport/Logistik' });
    expect(id).toBe(RESOURCE_SIGN_BY_ARTICLE_GROUP['Transport/Logistik']);
  });

  it('falls back to the placeholder when neither articleNumber nor articleGroup match', () => {
    const id = resolveResourceSignId({ articleNumber: 'ZM-UNKNOWN', articleGroup: 'Unknown Group' });
    expect(id).toBe(Signs.RESOURCE_PLACEHOLDER_SIGN_ID);
  });

  it('every id in RESOURCE_SIGN_BY_ARTICLE_NUMBER exists in Signs.SIGNS', () => {
    for (const id of Object.values(RESOURCE_SIGN_BY_ARTICLE_NUMBER)) {
      expect(Signs.getSignById(id)).toBeDefined();
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
      { articleNumber: 'ZM-A', articleGroup: 'Transport/Logistik' },
      { articleNumber: 'ZM-B', articleGroup: 'Transport/Logistik' },
    ];
    expect(resolveCollectionSignId(articles)).toBe(Signs.TRANSPORT_VEHICLE_SIGN_ID);
  });

  it('falls back to the Materialdepot collection sign for a mixed set of articles', () => {
    const articles = [
      { articleNumber: 'ZM-A', articleGroup: 'Transport/Logistik' },
      { articleNumber: 'ZM-B', articleGroup: 'Sanitätsmaterial' },
    ];
    expect(resolveCollectionSignId(articles)).toBe(RESOURCE_COLLECTION_SIGN_ID);
  });

  it('falls back to the Materialdepot collection sign when every article resolves to the placeholder', () => {
    const articles = [
      { articleNumber: 'ZM-A', articleGroup: 'Unknown' },
      { articleNumber: 'ZM-B', articleGroup: 'Unknown' },
    ];
    expect(resolveCollectionSignId(articles)).toBe(RESOURCE_COLLECTION_SIGN_ID);
  });

  it('returns the Materialdepot collection sign for an empty article list', () => {
    expect(resolveCollectionSignId([])).toBe(RESOURCE_COLLECTION_SIGN_ID);
  });
});
