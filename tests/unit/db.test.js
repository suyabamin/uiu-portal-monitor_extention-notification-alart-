import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  openDatabase,
  resetDatabaseInstance,
  putItem,
  getItem,
  getAllItems,
  putNotification,
  hasEventKey,
  getAllNotifications,
  markNotificationRead,
  addScan,
  getRecentScans,
  getPortalState,
  putPortalState,
  resetPortalBaseline,
  clearAllData
} from '../../src/storage/db.js';
import { PORTALS } from '../../src/core/constants.js';

describe('IndexedDB Storage Operations', () => {
  beforeEach(async () => {
    resetDatabaseInstance();
    await clearAllData();
  });

  it('stores and retrieves items by fingerprint', async () => {
    const item = {
      fingerprint: 'fp_test_1',
      portal: PORTALS.ELMS,
      title: 'Operating Systems Chapter 1',
      url: 'https://elms.uiu.ac.bd/mod/resource/view.php?id=1',
      lastSeenAt: new Date().toISOString()
    };

    await putItem(item);
    const retrieved = await getItem('fp_test_1');
    expect(retrieved).not.toBeNull();
    expect(retrieved.title).toBe('Operating Systems Chapter 1');

    const all = await getAllItems(PORTALS.ELMS);
    expect(all).toHaveLength(1);
  });

  it('stores notifications and deduplicates by eventKey', async () => {
    const notif = {
      notificationId: 'notif_1',
      eventKey: 'elms:fp_test_1:new_resource',
      portal: PORTALS.ELMS,
      title: 'New Resource',
      createdAt: new Date().toISOString(),
      readAt: null
    };

    await putNotification(notif);
    const exists = await hasEventKey('elms:fp_test_1:new_resource');
    expect(exists).toBe(true);

    const nonExistent = await hasEventKey('non_existent_key');
    expect(nonExistent).toBe(false);

    // Mark as read
    await markNotificationRead('notif_1');
    const all = await getAllNotifications({ unreadOnly: true });
    expect(all).toHaveLength(0);
  });

  it('manages portal baseline state and resets baseline', async () => {
    const state = {
      portal: PORTALS.UCAM,
      connectionState: 'connected',
      baselineReady: true,
      lastSuccessAt: new Date().toISOString()
    };

    await putPortalState(state);
    const retrievedState = await getPortalState(PORTALS.UCAM);
    expect(retrievedState.baselineReady).toBe(true);

    // Reset baseline
    await resetPortalBaseline(PORTALS.UCAM);
    const afterReset = await getPortalState(PORTALS.UCAM);
    expect(afterReset.baselineReady).toBe(false);
  });

  it('records and queries scans', async () => {
    const scan = {
      scanId: 'scan_001',
      portal: PORTALS.ELMS,
      startedAt: new Date().toISOString(),
      status: 'success',
      itemsRead: 5,
      newItems: 2
    };

    await addScan(scan);
    const recent = await getRecentScans(PORTALS.ELMS);
    expect(recent).toHaveLength(1);
    expect(recent[0].scanId).toBe('scan_001');
  });
});
