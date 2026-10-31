import { describe, it, expect } from 'vitest';
import { sha256, normalizeResourceUrl, generateItemFingerprint, generateEventKey } from '../../src/core/fingerprint.js';
import { PORTALS, ITEM_TYPES, EVENT_TYPES } from '../../src/core/constants.js';

describe('Fingerprint Generation & Normalization', () => {
  it('computes consistent SHA-256 hashes', async () => {
    const hash1 = await sha256('test-string');
    const hash2 = await sha256('test-string');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('normalizes resource URLs and strips session/volatile parameters', () => {
    const raw = 'https://elms.uiu.ac.bd/mod/resource/view.php?id=100&sesskey=abc1234&time=123456#topic1';
    const cleaned = normalizeResourceUrl(raw);
    expect(cleaned).toBe('https://elms.uiu.ac.bd/mod/resource/view.php?id=100');
  });

  it('generates stable item fingerprints using portal + courseId + itemId', async () => {
    const item1 = {
      portal: PORTALS.ELMS,
      courseId: '101',
      itemId: '501',
      title: 'Lecture 01'
    };
    const item2 = {
      portal: PORTALS.ELMS,
      courseId: '101',
      itemId: '501',
      title: 'Lecture 01 - Renamed slightly'
    };

    const fp1 = await generateItemFingerprint(item1);
    const fp2 = await generateItemFingerprint(item2);
    // Because itemId and courseId are identical, fingerprint matches
    expect(fp1).toBe(fp2);
  });

  it('generates stable event keys for deduplication', () => {
    const key1 = generateEventKey(PORTALS.ELMS, 'fp123', EVENT_TYPES.NEW_RESOURCE);
    expect(key1).toBe('elms:fp123:new_resource');

    const keyWithDeadline = generateEventKey(PORTALS.ELMS, 'fp123', EVENT_TYPES.DEADLINE_CHANGED, '2026-11-08T20:00:00Z');
    expect(keyWithDeadline).toBe('elms:fp123:deadline_changed:2026-11-08T20:00:00Z');
  });
});
