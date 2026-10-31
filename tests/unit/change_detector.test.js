import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { processPortalChanges } from '../../src/core/change_detector.js';
import { resetDatabaseInstance, clearAllData, getAllItems } from '../../src/storage/db.js';
import { PORTALS, ITEM_TYPES, EVENT_TYPES } from '../../src/core/constants.js';

describe('Change Detection Engine', () => {
  beforeEach(async () => {
    resetDatabaseInstance();
    await clearAllData();
  });

  it('establishes first-run baseline without notification flood', async () => {
    const initialItems = [
      {
        fingerprint: 'item_1',
        portal: PORTALS.ELMS,
        courseId: '101',
        itemId: '501',
        title: 'Old Slide 1',
        type: ITEM_TYPES.RESOURCE,
        url: 'https://elms.uiu.ac.bd/mod/resource/view.php?id=501'
      },
      {
        fingerprint: 'item_2',
        portal: PORTALS.ELMS,
        courseId: '101',
        itemId: '502',
        title: 'Old Assignment 1',
        type: ITEM_TYPES.ASSIGNMENT,
        url: 'https://elms.uiu.ac.bd/mod/assign/view.php?id=502'
      }
    ];

    const outcome = await processPortalChanges({
      portal: PORTALS.ELMS,
      items: initialItems,
      isBaselineReady: false,
      preferences: { notifications: { desktop: true, newResources: true, assignments: true } }
    });

    // Must store items as baseline
    expect(outcome.newItemsCount).toBe(2);
    // MUST NOT send any notifications on first run!
    expect(outcome.detectedEvents).toHaveLength(0);
    expect(outcome.notificationsToDeliver).toHaveLength(0);

    const stored = await getAllItems(PORTALS.ELMS);
    expect(stored).toHaveLength(2);
  });

  it('detects a genuinely new item in subsequent scans', async () => {
    // 1. Establish baseline first
    await processPortalChanges({
      portal: PORTALS.ELMS,
      items: [{
        fingerprint: 'baseline_item',
        portal: PORTALS.ELMS,
        title: 'Baseline Slide',
        type: ITEM_TYPES.RESOURCE,
        url: 'https://elms.uiu.ac.bd/mod/resource/view.php?id=1'
      }],
      isBaselineReady: false
    });

    // 2. Scan again with a new item
    const currentItems = [
      {
        fingerprint: 'baseline_item',
        portal: PORTALS.ELMS,
        title: 'Baseline Slide',
        type: ITEM_TYPES.RESOURCE,
        url: 'https://elms.uiu.ac.bd/mod/resource/view.php?id=1'
      },
      {
        fingerprint: 'new_item_3',
        portal: PORTALS.ELMS,
        courseName: 'CSE 4101',
        title: 'Brand New Homework 2',
        type: ITEM_TYPES.ASSIGNMENT,
        url: 'https://elms.uiu.ac.bd/mod/assign/view.php?id=999'
      }
    ];

    const outcome = await processPortalChanges({
      portal: PORTALS.ELMS,
      items: currentItems,
      isBaselineReady: true,
      preferences: { notifications: { assignments: true } }
    });

    expect(outcome.newItemsCount).toBe(1);
    expect(outcome.detectedEvents).toHaveLength(1);
    expect(outcome.detectedEvents[0].type).toBe(EVENT_TYPES.NEW_ASSIGNMENT);
    expect(outcome.notificationsToDeliver).toHaveLength(1);
    expect(outcome.notificationsToDeliver[0].title).toContain('New ASSIGNMENT: Brand New Homework 2');
  });

  it('prevents duplicate notifications on repeated scans', async () => {
    // Baseline
    await processPortalChanges({
      portal: PORTALS.UCAM,
      items: [],
      isBaselineReady: true
    });

    const newItem = {
      fingerprint: 'notice_42',
      portal: PORTALS.UCAM,
      title: 'Emergency Holiday Notice',
      type: ITEM_TYPES.NOTICE,
      url: 'https://ucam.uiu.ac.bd/NoticeDetail.aspx?id=42'
    };

    // First scan with new item -> should notify
    const firstScan = await processPortalChanges({
      portal: PORTALS.UCAM,
      items: [newItem],
      isBaselineReady: true,
      preferences: { notifications: { academicNotices: true } }
    });
    expect(firstScan.notificationsToDeliver).toHaveLength(1);

    // Second scan with the exact same item -> duplicate alert MUST be suppressed
    const secondScan = await processPortalChanges({
      portal: PORTALS.UCAM,
      items: [newItem],
      isBaselineReady: true,
      preferences: { notifications: { academicNotices: true } }
    });
    expect(secondScan.notificationsToDeliver).toHaveLength(0);
  });

  it('detects deadline changes on existing assignments', async () => {
    const itemV1 = {
      fingerprint: 'assign_100',
      portal: PORTALS.ELMS,
      title: 'Term Paper Submission',
      type: ITEM_TYPES.ASSIGNMENT,
      url: 'https://elms.uiu.ac.bd/mod/assign/view.php?id=100',
      dueAt: '2026-11-05T23:59:00Z'
    };

    // Baseline
    await processPortalChanges({
      portal: PORTALS.ELMS,
      items: [itemV1],
      isBaselineReady: false
    });

    // Professor extends deadline
    const itemV2 = {
      ...itemV1,
      dueAt: '2026-11-12T23:59:00Z'
    };

    const outcome = await processPortalChanges({
      portal: PORTALS.ELMS,
      items: [itemV2],
      isBaselineReady: true,
      preferences: { notifications: { deadlineChanges: true } }
    });

    expect(outcome.detectedEvents).toHaveLength(1);
    expect(outcome.detectedEvents[0].type).toBe(EVENT_TYPES.DEADLINE_CHANGED);
    expect(outcome.notificationsToDeliver).toHaveLength(1);
    expect(outcome.notificationsToDeliver[0].priority).toBe('high');
    expect(outcome.notificationsToDeliver[0].title).toContain('Deadline Changed');
  });

  it('respects user category preferences', async () => {
    // User turned off academic notices
    const preferences = {
      notifications: {
        academicNotices: false
      }
    };

    await processPortalChanges({
      portal: PORTALS.UCAM,
      items: [],
      isBaselineReady: true
    });

    const noticeItem = {
      fingerprint: 'notice_999',
      portal: PORTALS.UCAM,
      title: 'Routine Notice',
      type: ITEM_TYPES.NOTICE,
      url: 'https://ucam.uiu.ac.bd/NoticeDetail.aspx?id=999'
    };

    const outcome = await processPortalChanges({
      portal: PORTALS.UCAM,
      items: [noticeItem],
      isBaselineReady: true,
      preferences
    });

    // Event is detected, but notification delivery is suppressed by preference
    expect(outcome.detectedEvents).toHaveLength(1);
    expect(outcome.notificationsToDeliver).toHaveLength(0);
  });
});
