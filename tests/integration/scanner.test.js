import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { scanPortal, scanAllPortals } from '../../src/core/scanner.js';
import { resetDatabaseInstance, clearAllData, getPortalState, getAllItems } from '../../src/storage/db.js';
import { PORTALS, ITEM_TYPES } from '../../src/core/constants.js';

describe('Scanner Coordinator and Fault Isolation', () => {
  beforeEach(async () => {
    resetDatabaseInstance();
    await clearAllData();
  });

  it('runs an isolated portal scan successfully', async () => {
    const mockUcamAdapter = {
      scan: async () => ({
        items: [
          {
            fingerprint: 'mock_notice_1',
            portal: PORTALS.UCAM,
            title: 'Mock Holiday Notice',
            type: ITEM_TYPES.NOTICE,
            url: 'https://ucam.uiu.ac.bd/Notice.aspx'
          }
        ],
        status: 'success',
        errors: []
      })
    };

    const scanRecord = await scanPortal(PORTALS.UCAM, { [PORTALS.UCAM]: mockUcamAdapter });

    expect(scanRecord.status).toBe('success');
    expect(scanRecord.itemsRead).toBe(1);

    const state = await getPortalState(PORTALS.UCAM);
    expect(state.connectionState).toBe('connected');
    expect(state.baselineReady).toBe(true);

    const items = await getAllItems(PORTALS.UCAM);
    expect(items).toHaveLength(1);
  });

  it('isolates portal failures: UCAM failure does not prevent eLMS from succeeding', async () => {
    const mockUcamFailingAdapter = {
      scan: async () => {
        throw new Error('UCAM server timeout 504');
      }
    };

    const mockElmsWorkingAdapter = {
      scan: async () => ({
        items: [
          {
            fingerprint: 'mock_elms_1',
            portal: PORTALS.ELMS,
            courseName: 'Data Structures',
            title: 'BST Slides.pdf',
            type: ITEM_TYPES.RESOURCE,
            url: 'https://elms.uiu.ac.bd/mod/resource/view.php?id=99'
          }
        ],
        status: 'success',
        errors: []
      })
    };

    const results = await scanAllPortals({
      [PORTALS.UCAM]: mockUcamFailingAdapter,
      [PORTALS.ELMS]: mockElmsWorkingAdapter
    });

    expect(results).toHaveLength(2);

    // UCAM failed
    const ucamState = await getPortalState(PORTALS.UCAM);
    expect(ucamState.connectionState).toBe('network_error');

    // eLMS succeeded!
    const elmsState = await getPortalState(PORTALS.ELMS);
    expect(elmsState.connectionState).toBe('connected');
    expect(elmsState.baselineReady).toBe(true);

    const elmsItems = await getAllItems(PORTALS.ELMS);
    expect(elmsItems).toHaveLength(1);
    expect(elmsItems[0].title).toBe('BST Slides.pdf');
  });
});
